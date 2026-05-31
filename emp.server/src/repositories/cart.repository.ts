import type { PoolConnection } from 'mysql2/promise';
import { pool } from '../configs/database.config';

export interface CartItemQueryOptions {
  selectedOnly?: boolean;
  itemIds?: number[];
}

export interface AdminCartListFilters {
  search?: string;
  page: number;
  limit: number;
}

const cartItemSelect = `
  SELECT
    ci.id AS cart_item_id,
    ci.cart_id,
    ct.user_id AS cart_user_id,
    ci.variant_id,
    ci.quantity,
    ci.is_selected,
    ci.created_at AS cart_item_created_at,
    ci.updated_at AS cart_item_updated_at,
    pv.product_id,
    pv.sku,
    pv.price AS variant_price,
    pv.stock_quantity,
    pv.is_active AS variant_is_active,
    p.name AS product_name,
    p.slug AS product_slug,
    p.thumbnail_url AS product_thumbnail_url,
    p.sale_price,
    p.base_price,
    p.is_active AS product_is_active,
    b.name AS brand_name,
    c.name AS category_name,
    s.label AS size_label,
    clr.name AS color_name
  FROM cart_items ci
  INNER JOIN carts ct ON ct.id = ci.cart_id
  INNER JOIN product_variants pv ON pv.id = ci.variant_id
  INNER JOIN products p ON p.id = pv.product_id
  INNER JOIN brands b ON b.id = p.brand_id
  INNER JOIN categories c ON c.id = p.category_id
  INNER JOIN sizes s ON s.id = pv.size_id
  INNER JOIN colors clr ON clr.id = pv.color_id
`;

const variantSnapshotSelect = `
  SELECT
    pv.id AS variant_id,
    pv.product_id,
    pv.sku,
    pv.price AS variant_price,
    pv.stock_quantity,
    pv.is_active AS variant_is_active,
    p.name AS product_name,
    p.slug AS product_slug,
    p.thumbnail_url AS product_thumbnail_url,
    p.sale_price,
    p.base_price,
    p.is_active AS product_is_active,
    b.name AS brand_name,
    c.name AS category_name,
    s.label AS size_label,
    clr.name AS color_name
  FROM product_variants pv
  INNER JOIN products p ON p.id = pv.product_id
  INNER JOIN brands b ON b.id = p.brand_id
  INNER JOIN categories c ON c.id = p.category_id
  INNER JOIN sizes s ON s.id = pv.size_id
  INNER JOIN colors clr ON clr.id = pv.color_id
`;

const ensureCart = async (connection: PoolConnection, userId: number): Promise<number> => {
  const [rows] = await connection.query(
    `SELECT id
     FROM carts
     WHERE user_id = ?
     LIMIT 1
     FOR UPDATE`,
    [userId],
  );

  const existing = (rows as any[])[0];
  if (existing) return Number(existing.id);

  const [result] = await connection.query(
    `INSERT INTO carts (user_id) VALUES (?)`,
    [userId],
  );

  return Number((result as any).insertId);
};

const buildItemFilters = (
  userId: number,
  options?: CartItemQueryOptions,
): { sql: string; params: unknown[] } => {
  const clauses = ['ct.user_id = ?'];
  const params: unknown[] = [userId];

  if (options?.selectedOnly) {
    clauses.push('ci.is_selected = 1');
  }

  if (options?.itemIds && options.itemIds.length > 0) {
    clauses.push('ci.id IN (?)');
    params.push(options.itemIds);
  }

  return {
    sql: clauses.join(' AND '),
    params,
  };
};

export const cartRepository = {
  async ensure(userId: number) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const cartId = await ensureCart(connection, userId);
      await connection.commit();
      return cartId;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async getCart(userId: number) {
    const cartId = await this.ensure(userId);
    const [cartRows] = await pool.query(
      `SELECT id, user_id, created_at, updated_at
       FROM carts
       WHERE id = ?
       LIMIT 1`,
      [cartId],
    );

    const cart = (cartRows as any[])[0];
    const items = await this.getItems(userId);

    return {
      ...cart,
      items,
    };
  },

  async getItems(userId: number, options?: CartItemQueryOptions) {
    const filter = buildItemFilters(userId, options);
    const [rows] = await pool.query(
      `${cartItemSelect}
       WHERE ${filter.sql}
       ORDER BY ci.created_at DESC, ci.id DESC`,
      filter.params,
    );

    return rows as any[];
  },

  async getItemById(userId: number, itemId: number) {
    const [rows] = await pool.query(
      `${cartItemSelect}
       WHERE ct.user_id = ?
         AND ci.id = ?
       LIMIT 1`,
      [userId, itemId],
    );

    return (rows as any[])[0] ?? null;
  },

  async getVariantSnapshots(variantIds: number[]) {
    if (variantIds.length === 0) return [];

    const [rows] = await pool.query(
      `${variantSnapshotSelect}
       WHERE pv.id IN (?)
       ORDER BY pv.id ASC`,
      [variantIds],
    );

    return rows as any[];
  },

  async addItem(userId: number, variantId: number, quantity: number, selected: boolean) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const cartId = await ensureCart(connection, userId);

      await connection.query(
        `INSERT INTO cart_items (cart_id, variant_id, quantity, is_selected)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           quantity = quantity + VALUES(quantity),
           is_selected = VALUES(is_selected),
           updated_at = CURRENT_TIMESTAMP`,
        [cartId, variantId, quantity, selected ? 1 : 0],
      );

      await connection.query(
        `UPDATE carts
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cartId],
      );

      await connection.commit();
      return this.getCart(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateItem(
    userId: number,
    itemId: number,
    input: { quantity?: number; selected?: boolean },
  ) {
    const updates: string[] = [];
    const params: unknown[] = [];

    if (typeof input.quantity !== 'undefined') {
      updates.push('ci.quantity = ?');
      params.push(input.quantity);
    }

    if (typeof input.selected !== 'undefined') {
      updates.push('ci.is_selected = ?');
      params.push(input.selected ? 1 : 0);
    }

    if (updates.length === 0) return this.getCart(userId);

    const [result] = await pool.query(
      `UPDATE cart_items ci
       INNER JOIN carts ct ON ct.id = ci.cart_id
       SET ${updates.join(', ')}, ci.updated_at = CURRENT_TIMESTAMP
       WHERE ct.user_id = ?
         AND ci.id = ?`,
      [...params, userId, itemId],
    );

    if (Number((result as any).affectedRows || 0) === 0) {
      throw new Error('CART_ITEM_NOT_FOUND');
    }

    return this.getCart(userId);
  },

  async removeItem(userId: number, itemId: number) {
    const [result] = await pool.query(
      `DELETE ci
       FROM cart_items ci
       INNER JOIN carts ct ON ct.id = ci.cart_id
       WHERE ct.user_id = ?
         AND ci.id = ?`,
      [userId, itemId],
    );

    if (Number((result as any).affectedRows || 0) === 0) {
      throw new Error('CART_ITEM_NOT_FOUND');
    }

    return this.getCart(userId);
  },

  async selectAll(userId: number, selected: boolean) {
    await pool.query(
      `UPDATE cart_items ci
       INNER JOIN carts ct ON ct.id = ci.cart_id
       SET ci.is_selected = ?,
           ci.updated_at = CURRENT_TIMESTAMP
       WHERE ct.user_id = ?`,
      [selected ? 1 : 0, userId],
    );

    return this.getCart(userId);
  },

  async selectItems(userId: number, itemIds: number[], selected: boolean) {
    if (itemIds.length === 0) return this.getCart(userId);

    await pool.query(
      `UPDATE cart_items ci
       INNER JOIN carts ct ON ct.id = ci.cart_id
       SET ci.is_selected = ?,
           ci.updated_at = CURRENT_TIMESTAMP
       WHERE ct.user_id = ?
         AND ci.id IN (?)`,
      [selected ? 1 : 0, userId, itemIds],
    );

    return this.getCart(userId);
  },

  async upsertItems(
    userId: number,
    items: Array<{ variantId: number; quantity: number; selected: boolean }>,
  ) {
    if (items.length === 0) return this.getCart(userId);

    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();
      const cartId = await ensureCart(connection, userId);

      for (const item of items) {
        await connection.query(
          `INSERT INTO cart_items (cart_id, variant_id, quantity, is_selected)
           VALUES (?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             quantity = quantity + VALUES(quantity),
             is_selected = GREATEST(is_selected, VALUES(is_selected)),
             updated_at = CURRENT_TIMESTAMP`,
          [cartId, item.variantId, item.quantity, item.selected ? 1 : 0],
        );
      }

      await connection.query(
        `UPDATE carts
         SET updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [cartId],
      );

      await connection.commit();
      return this.getCart(userId);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async clearCart(
    userId: number,
    options?: {
      selectedOnly?: boolean;
      itemIds?: number[];
    },
  ) {
    const clauses = ['ct.user_id = ?'];
    const params: unknown[] = [userId];

    if (options?.selectedOnly) {
      clauses.push('ci.is_selected = 1');
    }

    if (options?.itemIds && options.itemIds.length > 0) {
      clauses.push('ci.id IN (?)');
      params.push(options.itemIds);
    }

    await pool.query(
      `DELETE ci
       FROM cart_items ci
       INNER JOIN carts ct ON ct.id = ci.cart_id
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    return this.getCart(userId);
  },

  async findCartByUserId(userId: number) {
    const [rows] = await pool.query(
      `SELECT
         ct.id,
         ct.user_id,
         ct.created_at,
         ct.updated_at,
         u.email AS user_email,
         u.full_name AS user_full_name
       FROM carts ct
       INNER JOIN users u ON u.id = ct.user_id
       WHERE ct.user_id = ?
       LIMIT 1`,
      [userId],
    );

    return (rows as any[])[0] ?? null;
  },

  async getCartForAdmin(userId: number) {
    const cart = await this.findCartByUserId(userId);
    if (!cart) return null;

    const items = await this.getItems(userId);
    return {
      ...cart,
      items,
    };
  },

  async listForAdmin(filters: AdminCartListFilters) {
    const clauses: string[] = ['1 = 1'];
    const params: unknown[] = [];

    if (filters.search) {
      clauses.push('(u.email LIKE ? OR COALESCE(u.full_name, \'\') LIKE ?)');
      const keyword = `%${filters.search}%`;
      params.push(keyword, keyword);
    }

    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `SELECT
         ct.id,
         ct.user_id,
         ct.created_at,
         ct.updated_at,
         u.email AS user_email,
         u.full_name AS user_full_name,
         COUNT(ci.id) AS item_count,
         COALESCE(SUM(ci.quantity), 0) AS total_quantity,
         COALESCE(SUM(CASE WHEN ci.is_selected = 1 THEN 1 ELSE 0 END), 0) AS selected_item_count,
         COALESCE(SUM(CASE WHEN ci.is_selected = 1 THEN ci.quantity ELSE 0 END), 0) AS selected_quantity
       FROM carts ct
       INNER JOIN users u ON u.id = ct.user_id
       LEFT JOIN cart_items ci ON ci.cart_id = ct.id
       WHERE ${clauses.join(' AND ')}
       GROUP BY ct.id, ct.user_id, ct.created_at, ct.updated_at, u.email, u.full_name
       ORDER BY ct.updated_at DESC, ct.id DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM carts ct
       INNER JOIN users u ON u.id = ct.user_id
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    const total = Number((countRows as any[])[0]?.total || 0);

    return {
      items: rows as any[],
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  },
};
