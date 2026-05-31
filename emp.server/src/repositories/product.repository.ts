import { pool } from '../configs/database.config';

export interface ProductListFilters {
  search?: string;
  categoryId?: number;
  categorySlug?: string;
  brandId?: number;
  minPrice?: number;
  maxPrice?: number;
  isFeatured?: boolean;
  status?: 'active' | 'inactive';
  includeInactive?: boolean;
  page: number;
  limit: number;
}

export interface CreateProductInput {
  categoryId: number;
  brandId: number;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  basePrice: number;
  salePrice?: number | null;
  thumbnailUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

export interface UpdateProductInput {
  categoryId?: number;
  brandId?: number;
  name?: string;
  slug?: string;
  shortDescription?: string | null;
  description?: string | null;
  basePrice?: number;
  salePrice?: number | null;
  thumbnailUrl?: string | null;
  isFeatured?: boolean;
  isActive?: boolean;
}

const buildWhereClause = (filters: ProductListFilters): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters.includeInactive) {
    if (filters.status === 'active') clauses.push('p.is_active = 1');
    else if (filters.status === 'inactive') clauses.push('p.is_active = 0');
  } else {
    clauses.push('p.is_active = 1');
  }

  if (filters.search) {
    const terms = filters.search
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);
    for (const term of terms) {
      const keyword = `%${term}%`;
      clauses.push(
        `(p.name LIKE ? OR p.short_description LIKE ? OR p.description LIKE ? OR b.name LIKE ? OR c.name LIKE ? OR pc.name LIKE ?)`,
      );
      params.push(keyword, keyword, keyword, keyword, keyword, keyword);
    }
  }
  if (filters.categoryId) {
    clauses.push('p.category_id = ?');
    params.push(filters.categoryId);
  }
  if (filters.categorySlug) {
    clauses.push('(c.slug = ? OR pc.slug = ?)');
    params.push(filters.categorySlug, filters.categorySlug);
  }
  if (filters.brandId) {
    clauses.push('p.brand_id = ?');
    params.push(filters.brandId);
  }
  if (typeof filters.minPrice === 'number') {
    clauses.push('COALESCE(p.sale_price, p.base_price) >= ?');
    params.push(filters.minPrice);
  }
  if (typeof filters.maxPrice === 'number') {
    clauses.push('COALESCE(p.sale_price, p.base_price) <= ?');
    params.push(filters.maxPrice);
  }
  if (typeof filters.isFeatured === 'boolean') {
    clauses.push('p.is_featured = ?');
    params.push(filters.isFeatured ? 1 : 0);
  }

  return { whereSql: clauses.length > 0 ? clauses.join(' AND ') : '1=1', params };
};

const listJoinSql = `
  INNER JOIN categories c ON c.id = p.category_id
  LEFT JOIN categories pc ON pc.id = c.parent_id
  INNER JOIN brands b ON b.id = p.brand_id
`;

export const productRepository = {
  async list(filters: ProductListFilters) {
    const { whereSql, params } = buildWhereClause(filters);
    const offset = (filters.page - 1) * filters.limit;
    const needsListJoins = Boolean(filters.categorySlug || filters.search);

    const [rows] = await pool.query(
      `
      SELECT
        p.id, p.name, p.slug, p.short_description, p.base_price, p.sale_price, p.thumbnail_url,
        p.is_featured, p.is_active, p.created_at,
        c.id AS category_id, c.name AS category_name, c.slug AS category_slug,
        pc.id AS parent_category_id, pc.name AS parent_category_name, pc.slug AS parent_category_slug,
        b.id AS brand_id, b.name AS brand_name,
        (
          SELECT COUNT(*)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS variant_count,
        (
          SELECT COALESCE(SUM(pv.stock_quantity), 0)
          FROM product_variants pv
          WHERE pv.product_id = p.id
        ) AS total_stock
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE ${whereSql}
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `
      SELECT COUNT(*) AS total
      FROM products p
      ${needsListJoins ? listJoinSql : ''}
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

  async getByIdOrSlug(identifier: string, includeInactive = false) {
    const isId = /^\d+$/.test(identifier);
    const activeClause = includeInactive ? '1=1' : 'p.is_active = 1';
    const [rows] = await pool.query(
      `
      SELECT
        p.*,
        c.name AS category_name,
        c.slug AS category_slug,
        pc.name AS parent_category_name,
        pc.slug AS parent_category_slug,
        b.name AS brand_name
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      LEFT JOIN categories pc ON pc.id = c.parent_id
      INNER JOIN brands b ON b.id = p.brand_id
      WHERE ${activeClause} AND ${isId ? 'p.id = ?' : 'p.slug = ?'}
      LIMIT 1
      `,
      [isId ? Number(identifier) : identifier],
    );
    return (rows as any[])[0] || null;
  },

  async getVariants(productId: number) {
    const [rows] = await pool.query(
      `
      SELECT
        pv.id, pv.sku, pv.price, pv.stock_quantity, pv.min_stock_threshold, pv.is_active,
        s.id AS size_id, s.label AS size_label,
        c.id AS color_id, c.name AS color_name, c.hex_code AS color_hex
      FROM product_variants pv
      INNER JOIN sizes s ON s.id = pv.size_id
      INNER JOIN colors c ON c.id = pv.color_id
      WHERE pv.product_id = ? AND pv.is_active = 1
      ORDER BY s.sort_order ASC, c.sort_order ASC, pv.id ASC
      `,
      [productId],
    );
    return rows as any[];
  },

  async getRelated(productId: number) {
    const [rows] = await pool.query(
      `
      SELECT
        pr.relation_type, pr.sort_order,
        p.id, p.name, p.slug, p.thumbnail_url, p.base_price, p.sale_price
      FROM product_relations pr
      INNER JOIN products p ON p.id = pr.related_product_id
      WHERE pr.product_id = ? AND p.is_active = 1
      ORDER BY pr.sort_order ASC, p.created_at DESC
      `,
      [productId],
    );
    return rows as any[];
  },

  async addRelated(
    productId: number,
    relatedProductId: number,
    relationType: 'RELATED' | 'CROSS_SELL' | 'UP_SELL',
    sortOrder = 0,
  ) {
    await pool.query(
      `
      INSERT INTO product_relations (product_id, related_product_id, relation_type, sort_order)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE sort_order = VALUES(sort_order)
      `,
      [productId, relatedProductId, relationType, sortOrder],
    );
    return this.getRelated(productId);
  },

  async removeRelated(
    productId: number,
    relatedProductId: number,
    relationType?: 'RELATED' | 'CROSS_SELL' | 'UP_SELL',
  ) {
    if (relationType) {
      await pool.query(
        `
        DELETE FROM product_relations
        WHERE product_id = ? AND related_product_id = ? AND relation_type = ?
        `,
        [productId, relatedProductId, relationType],
      );
    } else {
      await pool.query(
        `
        DELETE FROM product_relations
        WHERE product_id = ? AND related_product_id = ?
        `,
        [productId, relatedProductId],
      );
    }
  },

  async isSlugTaken(slug: string, excludeProductId?: number): Promise<boolean> {
    const params: unknown[] = [slug.trim()];
    let sql = 'SELECT id FROM products WHERE slug = ?';
    if (typeof excludeProductId === 'number' && excludeProductId > 0) {
      sql += ' AND id <> ?';
      params.push(excludeProductId);
    }
    sql += ' LIMIT 1';
    const [rows] = await pool.query(sql, params);
    return (rows as Array<{ id: number }>).length > 0;
  },

  async create(input: CreateProductInput) {
    try {
      const [result] = await pool.query(
        `
      INSERT INTO products (
        category_id, brand_id, name, slug, short_description, description,
        base_price, sale_price, thumbnail_url, is_featured, is_active
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
        [
          input.categoryId,
          input.brandId,
          input.name,
          input.slug,
          input.shortDescription ?? null,
          input.description ?? null,
          input.basePrice,
          input.salePrice ?? null,
          input.thumbnailUrl ?? null,
          input.isFeatured ? 1 : 0,
          input.isActive === false ? 0 : 1,
        ],
      );

      const insertedId = (result as any).insertId as number;
      return this.getByIdOrSlug(String(insertedId));
    } catch (err: unknown) {
      const e = err as { code?: string; errno?: number };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_PRODUCT_SLUG');
      }
      if (e.errno === 1452 || e.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('INVALID_CATEGORY_OR_BRAND');
      }
      throw err;
    }
  },

  async update(productId: number, input: UpdateProductInput) {
    const updates: string[] = [];
    const params: unknown[] = [];

    const map: Array<[keyof UpdateProductInput, string]> = [
      ['categoryId', 'category_id'],
      ['brandId', 'brand_id'],
      ['name', 'name'],
      ['slug', 'slug'],
      ['shortDescription', 'short_description'],
      ['description', 'description'],
      ['basePrice', 'base_price'],
      ['salePrice', 'sale_price'],
      ['thumbnailUrl', 'thumbnail_url'],
      ['isFeatured', 'is_featured'],
      ['isActive', 'is_active'],
    ];

    map.forEach(([key, column]) => {
      const value = input[key];
      if (typeof value !== 'undefined') {
        updates.push(`${column} = ?`);
        if (key === 'isFeatured' || key === 'isActive') {
          params.push(value ? 1 : 0);
        } else {
          params.push(value);
        }
      }
    });

    if (updates.length === 0) {
      return this.getByIdOrSlug(String(productId));
    }

    try {
      await pool.query(
        `
      UPDATE products
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
        [...params, productId],
      );
    } catch (err: unknown) {
      const e = err as { code?: string; errno?: number };
      if (e.code === 'ER_DUP_ENTRY') {
        throw new Error('DUPLICATE_PRODUCT_SLUG');
      }
      if (e.errno === 1452 || e.code === 'ER_NO_REFERENCED_ROW_2') {
        throw new Error('INVALID_CATEGORY_OR_BRAND');
      }
      throw err;
    }

    return this.getByIdOrSlug(String(productId));
  },

  async softDelete(productId: number) {
    await pool.query(
      `
      UPDATE products
      SET is_active = 0, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
      `,
      [productId],
    );
  },
};

