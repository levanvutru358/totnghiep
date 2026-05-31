import { pool } from '../configs/database.config';

export interface ColorListFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface CreateColorInput {
  name: string;
  hexCode?: string | null;
  sortOrder?: number;
}

export interface UpdateColorInput {
  name?: string;
  hexCode?: string | null;
  sortOrder?: number;
  isActive?: boolean;
}

const buildWhereClause = (filters: ColorListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['is_active = 1'];
  const params: unknown[] = [];
  if (filters.search) {
    clauses.push('name LIKE ?');
    params.push(`%${filters.search}%`);
  }
  return { whereSql: clauses.join(' AND '), params };
};

export const colorRepository = {
  async list(filters: ColorListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.query(
      `SELECT id, name, hex_code, sort_order, is_active, created_at, updated_at
       FROM colors WHERE ${whereSql}
       ORDER BY sort_order ASC, id ASC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM colors WHERE ${whereSql}`, params);
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page: filters.page, limit: filters.limit, totalPages: Math.ceil(total / filters.limit) };
  },

  async getById(id: number) {
    const [rows] = await pool.query(
      `SELECT id, name, hex_code, sort_order, is_active, created_at, updated_at FROM colors WHERE is_active = 1 AND id = ? LIMIT 1`,
      [id],
    );
    return (rows as any[])[0] || null;
  },

  async findByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) return null;
    const [rows] = await pool.query(
      `SELECT id, name FROM colors WHERE is_active = 1 AND LOWER(TRIM(name)) = LOWER(?) LIMIT 1`,
      [trimmed],
    );
    return (rows as Array<{ id: number; name: string }>)[0] || null;
  },

  async findOrCreateByName(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('INVALID_COLOR_NAME');
    const existing = await this.findByName(trimmed);
    if (existing) return existing.id;
    const created = await this.create({ name: trimmed });
    return Number(created.id);
  },

  async create(input: CreateColorInput) {
    try {
      const [result] = await pool.query(`INSERT INTO colors (name, hex_code, sort_order) VALUES (?, ?, ?)`, [
        input.name,
        input.hexCode ?? null,
        input.sortOrder ?? 0,
      ]);
      return this.getById((result as any).insertId);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_COLOR_NAME');
      }
      throw err;
    }
  },

  async update(id: number, input: UpdateColorInput) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (typeof input.name !== 'undefined') {
      updates.push('name = ?');
      params.push(input.name);
    }
    if (typeof input.hexCode !== 'undefined') {
      updates.push('hex_code = ?');
      params.push(input.hexCode ?? null);
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
    try {
      await pool.query(`UPDATE colors SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
        ...params,
        id,
      ]);
    } catch (err: unknown) {
      const e = err as { code?: string };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_COLOR_NAME');
      }
      throw err;
    }
    return this.getById(id);
  },

  async softDelete(id: number) {
    await pool.query(`UPDATE colors SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },
};
