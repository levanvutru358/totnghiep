import { pool } from '../configs/database.config';

export type InventoryTransactionType = 'IN' | 'OUT' | 'ADJUSTMENT';

export interface CreateInventoryTransactionInput {
  variantId: number;
  transactionType: InventoryTransactionType;
  quantity: number;
  note?: string | null;
  referenceCode?: string | null;
  createdBy?: string | null;
}

export interface InventoryListFilters {
  variantId?: number;
  transactionType?: InventoryTransactionType;
  brand?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  page: number;
  limit: number;
}

export interface UpdateInventoryTransactionInput {
  transactionType?: InventoryTransactionType;
  quantity?: number;
  note?: string | null;
}

const inventoryListJoins = `
  FROM inventory_transactions it
  INNER JOIN product_variants pv ON pv.id = it.variant_id
  INNER JOIN products p ON p.id = pv.product_id
  INNER JOIN brands b ON b.id = p.brand_id
`;

const buildWhereClause = (filters: InventoryListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];
  if (filters.variantId) {
    clauses.push('it.variant_id = ?');
    params.push(filters.variantId);
  }
  if (filters.transactionType) {
    clauses.push('it.transaction_type = ?');
    params.push(filters.transactionType);
  }
  if (filters.brand) {
    clauses.push('b.name = ?');
    params.push(filters.brand);
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    clauses.push('(pv.sku LIKE ? OR p.name LIKE ? OR b.name LIKE ?)');
    params.push(q, q, q);
  }
  if (filters.dateFrom) {
    clauses.push('it.created_at >= ?');
    params.push(`${filters.dateFrom} 00:00:00`);
  }
  if (filters.dateTo) {
    clauses.push('it.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(filters.dateTo);
  }
  return { whereSql: clauses.join(' AND '), params };
};

export const inventoryRepository = {
  async list(filters: InventoryListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.query(
      `SELECT
         it.id, it.variant_id, it.transaction_type, it.quantity, it.stock_after, it.note,
         it.reference_code, it.created_by, it.created_at, pv.sku,
         p.name AS product_name, b.name AS brand_name
       ${inventoryListJoins}
       WHERE ${whereSql}
       ORDER BY it.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total ${inventoryListJoins} WHERE ${whereSql}`,
      params,
    );
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

  async createAndApplyStock(input: CreateInventoryTransactionInput) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const [variantRows] = await connection.query(
        `SELECT id, stock_quantity FROM product_variants WHERE is_active = 1 AND id = ? LIMIT 1 FOR UPDATE`,
        [input.variantId],
      );
      const variant = (variantRows as any[])[0];
      if (!variant) throw new Error('VARIANT_NOT_FOUND');

      const currentStock = Number(variant.stock_quantity || 0);
      let nextStock = currentStock;
      if (input.transactionType === 'IN') nextStock = currentStock + input.quantity;
      if (input.transactionType === 'OUT') nextStock = currentStock - input.quantity;
      if (input.transactionType === 'ADJUSTMENT') nextStock = input.quantity;
      if (nextStock < 0) throw new Error('INSUFFICIENT_STOCK');

      const [insertResult] = await connection.query(
        `INSERT INTO inventory_transactions (
           variant_id, transaction_type, quantity, stock_after, note, reference_code, created_by
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          input.variantId,
          input.transactionType,
          input.quantity,
          nextStock,
          input.note ?? null,
          input.referenceCode ?? null,
          input.createdBy ?? null,
        ],
      );

      const insertedId = (insertResult as any).insertId as number;
      const finalStock = await this.syncVariantStock(input.variantId, connection);

      await connection.commit();

      const [rows] = await pool.query(
        `SELECT id, variant_id, transaction_type, quantity, stock_after, note, reference_code, created_by, created_at
         FROM inventory_transactions WHERE id = ? LIMIT 1`,
        [insertedId],
      );
      return { transaction: (rows as any[])[0], stockQuantity: finalStock };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getById(transactionId: number) {
    const [rows] = await pool.query(
      `SELECT id, variant_id, transaction_type, quantity, stock_after, note, reference_code, created_by, created_at
       FROM inventory_transactions WHERE id = ? LIMIT 1`,
      [transactionId],
    );
    return (rows as any[])[0] || null;
  },

  async syncVariantStock(variantId: number, connection?: import('mysql2/promise').PoolConnection) {
    const db = connection ?? pool;
    const [rows] = await db.query(
      `SELECT id, transaction_type, quantity
       FROM inventory_transactions
       WHERE variant_id = ?
       ORDER BY created_at ASC, id ASC`,
      [variantId],
    );

    let stock = 0;
    for (const row of rows as Array<{ id: number; transaction_type: InventoryTransactionType; quantity: number }>) {
      if (row.transaction_type === 'IN') stock += Number(row.quantity);
      if (row.transaction_type === 'OUT') stock -= Number(row.quantity);
      if (row.transaction_type === 'ADJUSTMENT') stock = Number(row.quantity);
      await db.query(`UPDATE inventory_transactions SET stock_after = ? WHERE id = ?`, [stock, row.id]);
    }

    await db.query(
      `UPDATE product_variants SET stock_quantity = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [stock, variantId],
    );

    return stock;
  },

  async updateById(transactionId: number, input: UpdateInventoryTransactionInput) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const existing = await this.getById(transactionId);
      if (!existing) throw new Error('TRANSACTION_NOT_FOUND');

      const variantId = Number(existing.variant_id);
      const nextType = input.transactionType ?? (existing.transaction_type as InventoryTransactionType);
      const nextQty =
        typeof input.quantity !== 'undefined' ? Number(input.quantity) : Number(existing.quantity);

      if (nextType === 'IN' || nextType === 'OUT') {
        if (!Number.isInteger(nextQty) || nextQty <= 0) throw new Error('INVALID_QUANTITY');
      } else if (!Number.isInteger(nextQty) || nextQty < 0) {
        throw new Error('INVALID_QUANTITY');
      }

      await connection.query(
        `UPDATE inventory_transactions
         SET transaction_type = ?, quantity = ?, note = ?
         WHERE id = ?`,
        [nextType, nextQty, input.note ?? existing.note ?? null, transactionId],
      );

      const nextStock = await this.syncVariantStock(variantId, connection);
      if (nextStock < 0) throw new Error('INSUFFICIENT_STOCK');

      await connection.commit();
      return this.getById(transactionId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async deleteById(transactionId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const existing = await this.getById(transactionId);
      if (!existing) throw new Error('TRANSACTION_NOT_FOUND');

      const variantId = Number(existing.variant_id);
      await connection.query(`DELETE FROM inventory_transactions WHERE id = ?`, [transactionId]);

      const nextStock = await this.syncVariantStock(variantId, connection);
      if (nextStock < 0) throw new Error('INSUFFICIENT_STOCK');

      await connection.commit();
      return { variantId, stockQuantity: nextStock };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
