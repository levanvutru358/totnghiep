import { pool } from '../configs/database.config';
import type { MarketingBannerPlacement, MarketingHomeSectionCode } from '../constants/marketing';

export type MarketingBannerRow = {
  id: number;
  placement: string;
  title: string;
  description: string | null;
  image_url: string;
  link_url: string;
  cta_label: string | null;
  sort_order: number;
  is_active: number;
  starts_at: Date | string | null;
  ends_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

export type MarketingHomeSectionRow = {
  code: string;
  title: string;
  subtitle: string | null;
  badge_label: string | null;
  link_url: string | null;
  is_active: number;
  sort_order: number;
};

export type MarketingFlashSaleRow = {
  id: number;
  section: string;
  product_id: number;
  badge_label: string | null;
  discount_percent: number | string | null;
  sort_order: number;
  is_active: number;
  ends_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
  product_name?: string;
  product_slug?: string;
  thumbnail_url?: string | null;
  base_price?: number;
  sale_price?: number | null;
  brand_name?: string;
  category_name?: string;
};

const bannerActiveClause = `
  is_active = 1
  AND (starts_at IS NULL OR starts_at <= NOW())
  AND (ends_at IS NULL OR ends_at >= NOW())
`;

export const marketingRepository = {
  async listBanners(filters: { placement?: string; isActive?: boolean }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.placement) {
      conditions.push('placement = ?');
      params.push(filters.placement);
    }
    if (typeof filters.isActive === 'boolean') {
      conditions.push('is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT * FROM marketing_banners ${where} ORDER BY sort_order ASC, id ASC`,
      params,
    );

    return rows as MarketingBannerRow[];
  },

  async findBannerById(id: number) {
    const [rows] = await pool.query(`SELECT * FROM marketing_banners WHERE id = ? LIMIT 1`, [id]);
    const list = rows as MarketingBannerRow[];
    return list[0] ?? null;
  },

  async createBanner(input: {
    placement: MarketingBannerPlacement;
    title: string;
    description: string | null;
    imageUrl: string;
    linkUrl: string;
    ctaLabel: string | null;
    sortOrder: number;
    isActive: boolean;
    startsAt: string | null;
    endsAt: string | null;
  }) {
    const [result] = await pool.query(
      `INSERT INTO marketing_banners (
        placement, title, description, image_url, link_url, cta_label,
        sort_order, is_active, starts_at, ends_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.placement,
        input.title,
        input.description,
        input.imageUrl,
        input.linkUrl,
        input.ctaLabel,
        input.sortOrder,
        input.isActive ? 1 : 0,
        input.startsAt,
        input.endsAt,
      ],
    );

    return this.findBannerById(Number((result as { insertId: number }).insertId));
  },

  async updateBanner(
    id: number,
    patch: Partial<{
      placement: MarketingBannerPlacement;
      title: string;
      description: string | null;
      imageUrl: string;
      linkUrl: string;
      ctaLabel: string | null;
      sortOrder: number;
      isActive: boolean;
      startsAt: string | null;
      endsAt: string | null;
    }>,
  ) {
    const map: Record<string, unknown> = {
      placement: patch.placement,
      title: patch.title,
      description: patch.description,
      image_url: patch.imageUrl,
      link_url: patch.linkUrl,
      cta_label: patch.ctaLabel,
      sort_order: patch.sortOrder,
      is_active: typeof patch.isActive === 'boolean' ? (patch.isActive ? 1 : 0) : undefined,
      starts_at: patch.startsAt,
      ends_at: patch.endsAt,
    };

    const updates: string[] = [];
    const params: unknown[] = [];

    Object.entries(map).forEach(([column, value]) => {
      if (typeof value === 'undefined') return;
      updates.push(`${column} = ?`);
      params.push(value);
    });

    if (updates.length === 0) return this.findBannerById(id);

    params.push(id);
    await pool.query(
      `UPDATE marketing_banners SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params,
    );

    return this.findBannerById(id);
  },

  async removeBanner(id: number) {
    const [result] = await pool.query(`DELETE FROM marketing_banners WHERE id = ?`, [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },

  async listActiveHeroBanners() {
    const [rows] = await pool.query(
      `SELECT * FROM marketing_banners
       WHERE placement = 'HOME_HERO' AND ${bannerActiveClause}
       ORDER BY sort_order ASC, id ASC`,
    );
    return rows as MarketingBannerRow[];
  },

  async listHomeSections() {
    const [rows] = await pool.query(
      `SELECT * FROM marketing_home_sections ORDER BY sort_order ASC, code ASC`,
    );
    return rows as MarketingHomeSectionRow[];
  },

  async updateHomeSection(
    code: MarketingHomeSectionCode,
    patch: Partial<{
      title: string;
      subtitle: string | null;
      badgeLabel: string | null;
      linkUrl: string | null;
      isActive: boolean;
      sortOrder: number;
    }>,
  ) {
    const map: Record<string, unknown> = {
      title: patch.title,
      subtitle: patch.subtitle,
      badge_label: patch.badgeLabel,
      link_url: patch.linkUrl,
      is_active: typeof patch.isActive === 'boolean' ? (patch.isActive ? 1 : 0) : undefined,
      sort_order: patch.sortOrder,
    };

    const updates: string[] = [];
    const params: unknown[] = [];

    Object.entries(map).forEach(([column, value]) => {
      if (typeof value === 'undefined') return;
      updates.push(`${column} = ?`);
      params.push(value);
    });

    if (updates.length === 0) return this.findHomeSection(code);

    params.push(code);
    await pool.query(
      `UPDATE marketing_home_sections SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE code = ?`,
      params,
    );

    return this.findHomeSection(code);
  },

  async findHomeSection(code: MarketingHomeSectionCode) {
    const [rows] = await pool.query(`SELECT * FROM marketing_home_sections WHERE code = ? LIMIT 1`, [
      code,
    ]);
    const list = rows as MarketingHomeSectionRow[];
    return list[0] ?? null;
  },

  async listSectionProducts(filters: { section?: MarketingHomeSectionCode; isActive?: boolean }) {
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (filters.section) {
      conditions.push('m.section = ?');
      params.push(filters.section);
    }

    if (typeof filters.isActive === 'boolean') {
      conditions.push('m.is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         m.*,
         p.name AS product_name,
         p.slug AS product_slug,
         p.thumbnail_url,
         p.base_price,
         p.sale_price,
         b.name AS brand_name,
         c.name AS category_name
       FROM marketing_flash_sale_items m
       INNER JOIN products p ON p.id = m.product_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
       ${where}
       ORDER BY m.sort_order ASC, m.id ASC`,
      params,
    );

    return rows as MarketingFlashSaleRow[];
  },

  async findSectionProductById(id: number) {
    const [rows] = await pool.query(
      `SELECT
         m.*,
         p.name AS product_name,
         p.slug AS product_slug,
         p.thumbnail_url,
         p.base_price,
         p.sale_price,
         b.name AS brand_name,
         c.name AS category_name
       FROM marketing_flash_sale_items m
       INNER JOIN products p ON p.id = m.product_id
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE m.id = ?
       LIMIT 1`,
      [id],
    );
    const list = rows as MarketingFlashSaleRow[];
    return list[0] ?? null;
  },

  async findSectionProductByProductId(section: MarketingHomeSectionCode, productId: number) {
    const [rows] = await pool.query(
      `SELECT id FROM marketing_flash_sale_items WHERE section = ? AND product_id = ? LIMIT 1`,
      [section, productId],
    );
    const list = rows as Array<{ id: number }>;
    return list[0]?.id ?? null;
  },

  async createSectionProduct(input: {
    section: MarketingHomeSectionCode;
    productId: number;
    badgeLabel: string | null;
    discountPercent: number | null;
    sortOrder: number;
    isActive: boolean;
    endsAt: string | null;
  }) {
    const [result] = await pool.query(
      `INSERT INTO marketing_flash_sale_items (section, product_id, badge_label, discount_percent, sort_order, is_active, ends_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.section,
        input.productId,
        input.badgeLabel,
        input.discountPercent,
        input.sortOrder,
        input.isActive ? 1 : 0,
        input.endsAt,
      ],
    );

    return this.findSectionProductById(Number((result as { insertId: number }).insertId));
  },

  async updateSectionProduct(
    id: number,
    patch: Partial<{
      productId: number;
      badgeLabel: string | null;
      discountPercent: number | null;
      sortOrder: number;
      isActive: boolean;
      endsAt: string | null;
    }>,
  ) {
    const map: Record<string, unknown> = {
      product_id: patch.productId,
      badge_label: patch.badgeLabel,
      discount_percent: patch.discountPercent,
      sort_order: patch.sortOrder,
      is_active: typeof patch.isActive === 'boolean' ? (patch.isActive ? 1 : 0) : undefined,
      ends_at: patch.endsAt,
    };

    const updates: string[] = [];
    const params: unknown[] = [];

    Object.entries(map).forEach(([column, value]) => {
      if (typeof value === 'undefined') return;
      updates.push(`${column} = ?`);
      params.push(value);
    });

    if (updates.length === 0) return this.findSectionProductById(id);

    params.push(id);
    await pool.query(
      `UPDATE marketing_flash_sale_items SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      params,
    );

    return this.findSectionProductById(id);
  },

  async removeSectionProduct(id: number) {
    const [result] = await pool.query(`DELETE FROM marketing_flash_sale_items WHERE id = ?`, [id]);
    return Number((result as { affectedRows?: number }).affectedRows ?? 0) > 0;
  },

  async listActiveSectionProducts(section: MarketingHomeSectionCode, limit = 24) {
    const [rows] = await pool.query(
      `SELECT
         m.*,
         p.name AS product_name,
         p.slug AS product_slug,
         p.thumbnail_url,
         p.base_price,
         p.sale_price,
         b.name AS brand_name,
         c.name AS category_name
       FROM marketing_flash_sale_items m
       INNER JOIN products p ON p.id = m.product_id AND p.is_active = 1
       LEFT JOIN brands b ON b.id = p.brand_id
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE m.section = ?
         AND m.is_active = 1
         AND (m.ends_at IS NULL OR m.ends_at >= NOW())
       ORDER BY m.sort_order ASC, m.id ASC
       LIMIT ?`,
      [section, limit],
    );

    return rows as MarketingFlashSaleRow[];
  },

  async productExists(productId: number) {
    const [rows] = await pool.query(
      `SELECT id FROM products WHERE id = ? AND is_active = 1 LIMIT 1`,
      [productId],
    );
    const list = rows as Array<{ id: number }>;
    return Boolean(list[0]);
  },

  async findActiveOffersForProductIds(productIds: number[]) {
    if (productIds.length === 0) return new Map<number, number>();

    const [rows] = await pool.query(
      `SELECT m.product_id, m.discount_percent
       FROM marketing_flash_sale_items m
       INNER JOIN products p ON p.id = m.product_id AND p.is_active = 1
       WHERE m.product_id IN (?)
         AND m.is_active = 1
         AND (m.ends_at IS NULL OR m.ends_at >= NOW())
         AND m.discount_percent IS NOT NULL
         AND m.discount_percent > 0
       ORDER BY m.discount_percent DESC, m.sort_order ASC, m.id ASC`,
      [productIds],
    );

    const map = new Map<number, number>();
    for (const row of rows as Array<{ product_id: number; discount_percent: number | string }>) {
      const pid = Number(row.product_id);
      if (!map.has(pid)) {
        map.set(pid, Number(row.discount_percent));
      }
    }
    return map;
  },

  /** Khuyến mãi % cao nhất đang áp dụng cho sản phẩm (trang chủ / chi tiết). */
  async findBestActiveOfferForProduct(productId: number) {
    const [rows] = await pool.query(
      `SELECT m.discount_percent, m.badge_label, m.section
       FROM marketing_flash_sale_items m
       INNER JOIN products p ON p.id = m.product_id AND p.is_active = 1
       WHERE m.product_id = ?
         AND m.is_active = 1
         AND (m.ends_at IS NULL OR m.ends_at >= NOW())
         AND m.discount_percent IS NOT NULL
         AND m.discount_percent > 0
       ORDER BY m.discount_percent DESC, m.sort_order ASC, m.id ASC
       LIMIT 1`,
      [productId],
    );
    const list = rows as Array<{
      discount_percent: number | string;
      badge_label: string | null;
      section: string;
    }>;
    return list[0] ?? null;
  },
};
