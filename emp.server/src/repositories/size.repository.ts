import { pool } from '../configs/database.config';

export interface SizeListFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface CreateSizeInput {
  label: string;
  sortOrder?: number;
}

export interface UpdateSizeInput {
  label?: string;
  sortOrder?: number;
  isActive?: boolean;
}

const buildWhereClause = (filters: SizeListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['is_active = 1'];
  const params: unknown[] = [];
  if (filters.search) {
    clauses.push('label LIKE ?');
    params.push(`%${filters.search}%`);
  }
  return { whereSql: clauses.join(' AND '), params };
};

export const sizeRepository = {
  async list(filters: SizeListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.query(
      `SELECT id, label, sort_order, is_active, created_at, updated_at
       FROM sizes WHERE ${whereSql}
       ORDER BY sort_order ASC, id ASC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM sizes WHERE ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

  async getById(id: number) {
    const [rows] = await pool.query(
      `SELECT id, label, sort_order, is_active, created_at, updated_at FROM sizes WHERE is_active = 1 AND id = ? LIMIT 1`,
      [id],
    );
    return (rows as any[])[0] || null;
  },

  async create(input: CreateSizeInput) {
    try {
      const [result] = await pool.query(`INSERT INTO sizes (label, sort_order) VALUES (?, ?)`, [
        input.label,
        input.sortOrder ?? 0,
      ]);
      return this.getById((result as any).insertId);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_SIZE_LABEL');
      }
      throw err;
    }
  },

  async update(id: number, input: UpdateSizeInput) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (typeof input.label !== 'undefined') {
      updates.push('label = ?');
      params.push(input.label);
    }
    if (typeof input.sortOrder !== 'undefined') {
      updates.push('sort_order = ?');
      params.push(input.sortOrder);
    }
    if (typeof input.isActive !== 'undefined') {
      updates.push('is_active = ?');
      params.push(input.isActive ? 1 : 0);
    }
    if (updates.length === 0) return this.getById(id);
    await pool.query(`UPDATE sizes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...params, id]);
    return this.getById(id);
  },

  async softDelete(id: number) {
    await pool.query(`UPDATE sizes SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },
};
