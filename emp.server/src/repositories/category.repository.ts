import { pool } from '../configs/database.config';

export interface CategoryListFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface CreateCategoryInput {
  name: string;
  slug: string;
  description?: string | null;
  parentId?: number | null;
}

export interface UpdateCategoryInput {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
}

const buildWhereClause = (filters: CategoryListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['is_active = 1'];
  const params: unknown[] = [];

  if (filters.search) {
    clauses.push('(name LIKE ? OR description LIKE ?)');
    const keyword = `%${filters.search}%`;
    params.push(keyword, keyword);
  }

  return { whereSql: clauses.join(' AND '), params };
};

export const categoryRepository = {
  async list(filters: CategoryListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.parent_id,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name AS parent_name,
        p.slug AS parent_slug
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
      WHERE ${whereSql.replace(/\bis_active\b/g, 'c.is_active')}
      ORDER BY
        COALESCE(p.id, c.id) ASC,
        c.parent_id IS NOT NULL,
        c.name ASC
      LIMIT ? OFFSET ?
      `,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM categories c
      WHERE ${whereSql.replace(/\bis_active\b/g, 'c.is_active')}
      `,
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

  async getByIdOrSlug(identifier: string) {
    const isId = /^\d+$/.test(identifier);
    const [rows] = await pool.query(
      `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.parent_id,
        c.is_active,
        c.created_at,
        c.updated_at,
        p.name AS parent_name,
        p.slug AS parent_slug
      FROM categories c
      LEFT JOIN categories p ON p.id = c.parent_id
      WHERE c.is_active = 1 AND ${isId ? 'c.id = ?' : 'c.slug = ?'}
      LIMIT 1
      `,
      [isId ? Number(identifier) : identifier],
    );

    return (rows as any[])[0] || null;
  },

  async create(input: CreateCategoryInput) {
    const [result] = await pool.query(
      `
      INSERT INTO categories (name, slug, description, parent_id, is_active)
      VALUES (?, ?, ?, ?, 1)
      `,
      [input.name, input.slug, input.description ?? null, input.parentId ?? null],
    );

    const insertedId = (result as any).insertId as number;
    return this.getByIdOrSlug(String(insertedId));
  },

  async update(categoryId: number, input: UpdateCategoryInput) {
    const updates: string[] = [];
    const params: unknown[] = [];

    const map: Array<[keyof UpdateCategoryInput, string]> = [
      ['name', 'name'],
      ['slug', 'slug'],
      ['description', 'description'],
      ['isActive', 'is_active'],
    ];

    map.forEach(([key, column]) => {
      const value = input[key];
      if (typeof value !== 'undefined') {
        updates.push(`${column} = ?`);
        if (key === 'isActive') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return this.getByIdOrSlug(String(categoryId));
    }

    await pool.query(
      `
      UPDATE categories
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [...params, categoryId],
    );

    return this.getByIdOrSlug(String(categoryId));
  },

  async softDelete(categoryId: number) {
    await pool.query(
      `
      UPDATE categories
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [categoryId],
    );
  },
};
