import { pool } from '../configs/database.config';

export interface CustomerListFilters {
  search?: string;
  status?: 'all' | 'active' | 'locked' | 'temp_locked';
  page: number;
  limit: number;
}

const customerFrom = `
  FROM users u
  INNER JOIN roles r ON r.id = u.role_id
  LEFT JOIN orders o ON o.user_id = u.id
`;

const customerSelect = `
  u.id, u.email, u.full_name, u.is_active, u.account_status, u.lock_reason, u.locked_until, u.locked_at,
  u.created_at, u.updated_at,
  COUNT(o.id) AS order_count,
  COALESCE(SUM(CASE WHEN o.status NOT IN ('CANCELLED') THEN o.total_amount ELSE 0 END), 0) AS total_spent
`;

export const customerRepository = {
  async list(filters: CustomerListFilters) {
    const clauses = ["r.code = 'CUSTOMER'"];
    const params: unknown[] = [];

    if (filters.search?.trim()) {
      const q = `%${filters.search.trim()}%`;
      clauses.push('(u.email LIKE ? OR u.full_name LIKE ?)');
      params.push(q, q);
    }
    if (filters.status === 'active') clauses.push("u.account_status = 'ACTIVE'");
    if (filters.status === 'locked') clauses.push("u.account_status = 'LOCKED'");
    if (filters.status === 'temp_locked') clauses.push("u.account_status = 'TEMP_LOCKED'");

    const whereSql = clauses.join(' AND ');
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `SELECT ${customerSelect}
       ${customerFrom}
       WHERE ${whereSql}
       GROUP BY u.id, u.email, u.full_name, u.is_active, u.account_status, u.lock_reason, u.locked_until, u.locked_at,
                u.created_at, u.updated_at
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE ${whereSql}`,
      params,
    );

    const total = Number((countRows as any[])[0]?.total || 0);
    return {
      items: rows as any[],
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  },

  async getById(id: number) {
    const [rows] = await pool.query(
      `SELECT ${customerSelect}
       ${customerFrom}
       WHERE u.id = ? AND r.code = 'CUSTOMER'
       GROUP BY u.id, u.email, u.full_name, u.is_active, u.account_status, u.lock_reason, u.locked_until, u.locked_at,
                u.created_at, u.updated_at
       LIMIT 1`,
      [id],
    );
    return (rows as any[])[0] || null;
  },

  async getRecentOrders(userId: number, limit = 10) {
    const [rows] = await pool.query(
      `SELECT id, order_code, status, payment_status, total_amount, currency_code, created_at
       FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT ?`,
      [userId, limit],
    );
    return rows as any[];
  },

  async getAddressesFromOrders(userId: number, limit = 20) {
    const [rows] = await pool.query(
      `SELECT
         MAX(id) AS last_order_id,
         recipient_name,
         recipient_phone,
         shipping_address_line1,
         shipping_address_line2,
         shipping_ward,
         shipping_district,
         shipping_province,
         shipping_postal_code,
         MAX(created_at) AS last_used_at,
         COUNT(*) AS used_count
       FROM orders
       WHERE user_id = ?
       GROUP BY recipient_name, recipient_phone, shipping_address_line1, shipping_address_line2,
                shipping_ward, shipping_district, shipping_province, shipping_postal_code
       ORDER BY last_used_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows as any[];
  },

  async getReviews(userId: number, limit = 20) {
    const [rows] = await pool.query(
      `SELECT r.id, r.product_id, p.name AS product_name, r.rating, r.title, r.content, r.status, r.created_at
       FROM product_reviews r
       INNER JOIN products p ON p.id = r.product_id
       WHERE r.user_id = ? AND r.is_active = 1
       ORDER BY r.created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows as any[];
  },

  async getComments(userId: number, limit = 20) {
    const [rows] = await pool.query(
      `SELECT c.id, c.product_id, p.name AS product_name, c.content, c.status, c.parent_id, c.created_at
       FROM product_comments c
       INNER JOIN products p ON p.id = c.product_id
       WHERE c.user_id = ? AND c.is_active = 1
       ORDER BY c.created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows as any[];
  },

  async update(id: number, input: Partial<{ fullName: string | null }>) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (typeof input.fullName !== 'undefined') {
      updates.push('full_name = ?');
      params.push(input.fullName);
    }
    if (!updates.length) return this.getById(id);
    await pool.query(
      `UPDATE users u
       INNER JOIN roles r ON r.id = u.role_id
       SET ${updates.join(', ')}, u.updated_at = CURRENT_TIMESTAMP
       WHERE u.id = ? AND r.code = 'CUSTOMER'`,
      [...params, id],
    );
    return this.getById(id);
  },
};
