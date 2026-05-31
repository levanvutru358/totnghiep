import { pool } from '../configs/database.config';

export interface VariantListFilters {
  productId?: number;
  sizeId?: number;
  colorId?: number;
  sku?: string;
  page: number;
  limit: number;
}

export interface CreateVariantInput {
  productId: number;
  sizeId: number;
  colorId: number;
  sku: string;
  barcode?: string | null;
  price?: number | null;
  stockQuantity?: number;
  minStockThreshold?: number;
}

export interface UpdateVariantInput {
  sizeId?: number;
  colorId?: number;
  sku?: string;
  barcode?: string | null;
  price?: number | null;
  stockQuantity?: number;
  minStockThreshold?: number;
  isActive?: boolean;
}

const buildWhereClause = (filters: VariantListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['pv.is_active = 1'];
  const params: unknown[] = [];
  if (filters.productId) {
    clauses.push('pv.product_id = ?');
    params.push(filters.productId);
  }
  if (filters.sizeId) {
    clauses.push('pv.size_id = ?');
    params.push(filters.sizeId);
  }
  if (filters.colorId) {
    clauses.push('pv.color_id = ?');
    params.push(filters.colorId);
  }
  if (filters.sku) {
    clauses.push('pv.sku LIKE ?');
    params.push(`%${filters.sku}%`);
  }
  return { whereSql: clauses.join(' AND '), params };
};

const baseSelect = `
  SELECT
    pv.id, pv.product_id, pv.size_id, pv.color_id, pv.sku, pv.barcode, pv.price,
    pv.stock_quantity, pv.min_stock_threshold, pv.is_active, pv.created_at, pv.updated_at,
    s.label AS size_label,
    c.name AS color_name, c.hex_code AS color_hex,
    p.name AS product_name,
    b.name AS brand_name,
    cat.name AS category_name
  FROM product_variants pv
  INNER JOIN products p ON p.id = pv.product_id
  INNER JOIN brands b ON b.id = p.brand_id
  INNER JOIN categories cat ON cat.id = p.category_id
  INNER JOIN sizes s ON s.id = pv.size_id
  INNER JOIN colors c ON c.id = pv.color_id
`;

export const variantRepository = {
  async list(filters: VariantListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.query(
      `${baseSelect}
       WHERE ${whereSql}
       ORDER BY b.name ASC, p.name ASC, pv.sku ASC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM product_variants pv WHERE ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

  async getById(id: number) {
    const [rows] = await pool.query(`${baseSelect} WHERE pv.is_active = 1 AND pv.id = ? LIMIT 1`, [id]);
    return (rows as any[])[0] || null;
  },

  async create(input: CreateVariantInput) {
    try {
      const [result] = await pool.query(
        `INSERT INTO product_variants (
        product_id, size_id, color_id, sku, barcode, price, stock_quantity, min_stock_threshold
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.productId,
          input.sizeId,
          input.colorId,
          input.sku,
          input.barcode ?? null,
          input.price ?? null,
          input.stockQuantity ?? 0,
          input.minStockThreshold ?? 0,
        ],
      );
      return this.getById((result as any).insertId);
    } catch (err: unknown) {
      const e = err as { code?: string; errno?: number };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('VARIANT_ALREADY_EXISTS');
      }
      if (e.errno === 1452 || e.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('INVALID_VARIANT_REFERENCE');
      }
      throw err;
    }
  },

  async update(id: number, input: UpdateVariantInput) {
    const updates: string[] = [];
    const params: unknown[] = [];
    const map: Array<[keyof UpdateVariantInput, string]> = [
      ['sizeId', 'size_id'],
      ['colorId', 'color_id'],
      ['sku', 'sku'],
      ['barcode', 'barcode'],
      ['price', 'price'],
      ['stockQuantity', 'stock_quantity'],
      ['minStockThreshold', 'min_stock_threshold'],
      ['isActive', 'is_active'],
    ];
    map.forEach(([key, column]) => {
      const value = input[key];
      if (typeof value !== 'undefined') {
        updates.push(`${column} = ?`);
        if (key === 'isActive') params.push(value ? 1 : 0);
        else params.push(value);
      }
    });
    if (updates.length === 0) return this.getById(id);
    try {
      await pool.query(
        `UPDATE product_variants SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [...params, id],
      );
    } catch (err: unknown) {
      const e = err as { code?: string; errno?: number };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('VARIANT_ALREADY_EXISTS');
      }
      if (e.errno === 1452 || e.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('INVALID_VARIANT_REFERENCE');
      }
      throw err;
    }
    return this.getById(id);
  },

  async softDelete(id: number) {
    await pool.query(`UPDATE product_variants SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },
};
