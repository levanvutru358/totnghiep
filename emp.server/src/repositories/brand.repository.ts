import { pool } from '../configs/database.config';

export interface BrandListFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface CreateBrandInput {
  name: string;
  slug: string;
  description?: string | null;
}

export interface UpdateBrandInput {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
}

const buildWhereClause = (filters: BrandListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['is_active = 1'];
  const params: unknown[] = [];

  if (filters.search) {
    clauses.push('(name LIKE ? OR description LIKE ?)');
    const keyword = `%${filters.search}%`;
    params.push(keyword, keyword);
  }

  return { whereSql: clauses.join(' AND '), params };
};

export const brandRepository = {
  async list(filters: BrandListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `
      SELECT id, name, slug, description, is_active, created_at, updated_at
      FROM brands
      WHERE ${whereSql}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM brands
      WHERE ${whereSql}
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
      SELECT id, name, slug, description, is_active, created_at, updated_at
      FROM brands
      WHERE is_active = 1 AND ${isId ? 'id = ?' : 'slug = ?'}
      LIMIT 1
      `,
      [isId ? Number(identifier) : identifier],
    );

    return (rows as any[])[0] || null;
  },

  async create(input: CreateBrandInput) {
    const [result] = await pool.query(
      `
      INSERT INTO brands (name, slug, description)
      VALUES (?, ?, ?)
      `,
      [input.name, input.slug, input.description ?? null],
    );

    const insertedId = (result as any).insertId as number;
    return this.getByIdOrSlug(String(insertedId));
  },

  async update(brandId: number, input: UpdateBrandInput) {
    const updates: string[] = [];
    const params: unknown[] = [];

    const map: Array<[keyof UpdateBrandInput, string]> = [
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
      return this.getByIdOrSlug(String(brandId));
    }

    await pool.query(
      `
      UPDATE brands
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [...params, brandId],
    );

    return this.getByIdOrSlug(String(brandId));
  },

  async softDelete(brandId: number) {
    await pool.query(
      `
      UPDATE brands
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [brandId],
    );
  },
};
