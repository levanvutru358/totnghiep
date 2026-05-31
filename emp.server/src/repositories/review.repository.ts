import { pool } from '../configs/database.config';
import type { ReviewStatus } from '../constants/reviews';

export interface ReviewListFilters {
  productId?: number;
  userId?: number;
  status?: ReviewStatus;
  rating?: number;
  search?: string;
  publicOnly?: boolean;
  hasImage?: boolean;
  verified?: boolean;
  page: number;
  limit: number;
  sort?: 'newest' | 'oldest' | 'rating_high' | 'rating_low';
}

const reviewFrom = `
  FROM product_reviews r
  INNER JOIN products p ON p.id = r.product_id
  INNER JOIN users u ON u.id = r.user_id
`;

const reviewSelect = `
  SELECT r.id, r.product_id, r.user_id, r.order_id, r.rating, r.title, r.content,
         r.status, r.is_verified,
         (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id) AS like_count,
         r.is_active, r.admin_note,
         r.created_at, r.updated_at,
         p.name AS product_name, p.slug AS product_slug,
         u.full_name AS user_name, u.email AS user_email
  ${reviewFrom}
`;

const buildWhere = (filters: ReviewListFilters) => {
  const clauses: string[] = ['r.is_active = 1'];
  const params: unknown[] = [];
  if (filters.publicOnly) clauses.push("r.status = 'APPROVED'");
  else if (filters.status) {
    clauses.push('r.status = ?');
    params.push(filters.status);
  }
  if (filters.productId) {
    clauses.push('r.product_id = ?');
    params.push(filters.productId);
  }
  if (filters.userId) {
    clauses.push('r.user_id = ?');
    params.push(filters.userId);
  }
  if (filters.rating) {
    clauses.push('r.rating = ?');
    params.push(filters.rating);
  }
  if (filters.verified) {
    clauses.push('r.is_verified = 1');
  }
  if (filters.hasImage) {
    clauses.push('EXISTS (SELECT 1 FROM review_images ri WHERE ri.review_id = r.id)');
  }
  if (filters.search) {
    const q = `%${filters.search}%`;
    clauses.push('(r.content LIKE ? OR r.title LIKE ? OR p.name LIKE ?)');
    params.push(q, q, q);
  }
  return { whereSql: clauses.join(' AND '), params };
};

const orderBy = (sort?: ReviewListFilters['sort']) => {
  switch (sort) {
    case 'oldest':
      return 'r.created_at ASC';
    case 'rating_high':
      return 'r.rating DESC, r.created_at DESC';
    case 'rating_low':
      return 'r.rating ASC, r.created_at DESC';
    default:
      return 'r.created_at DESC';
  }
};

export const reviewRepository = {
  async list(filters: ReviewListFilters) {
    const { whereSql, params } = buildWhere(filters);
    const offset = (filters.page - 1) * filters.limit;
    const [rows] = await pool.query(
      `${reviewSelect} WHERE ${whereSql} ORDER BY ${orderBy(filters.sort)} LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total ${reviewFrom} WHERE ${whereSql}`,
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
    const [rows] = await pool.query(`${reviewSelect} WHERE r.id = ? LIMIT 1`, [id]);
    return (rows as any[])[0] || null;
  },

  async getImages(reviewId: number) {
    const [rows] = await pool.query(
      `SELECT id, review_id, upload_id, image_url, sort_order FROM review_images WHERE review_id = ? ORDER BY sort_order, id`,
      [reviewId],
    );
    return rows as any[];
  },

  async getImagesByReviewIds(reviewIds: number[]) {
    const map = new Map<number, any[]>();
    if (!reviewIds.length) return map;
    const placeholders = reviewIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, review_id, upload_id, image_url, sort_order
       FROM review_images WHERE review_id IN (${placeholders}) ORDER BY review_id, sort_order, id`,
      reviewIds,
    );
    for (const row of rows as any[]) {
      const reviewId = Number(row.review_id);
      const list = map.get(reviewId) ?? [];
      list.push(row);
      map.set(reviewId, list);
    }
    return map;
  },

  async getByUserAndProduct(userId: number, productId: number) {
    const [rows] = await pool.query(
      `${reviewSelect} WHERE r.user_id = ? AND r.product_id = ? AND r.is_active = 1 LIMIT 1`,
      [userId, productId],
    );
    return (rows as any[])[0] || null;
  },

  async getByUserAndProductIncludingInactive(userId: number, productId: number) {
    const [rows] = await pool.query(
      `${reviewSelect} WHERE r.user_id = ? AND r.product_id = ? LIMIT 1`,
      [userId, productId],
    );
    return (rows as any[])[0] || null;
  },

  async clearImages(reviewId: number) {
    await pool.query(`DELETE FROM review_images WHERE review_id = ?`, [reviewId]);
  },

  async getStatistics(productId: number) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total_count, ROUND(AVG(rating), 1) AS average_rating,
              SUM(CASE WHEN rating = 1 THEN 1 ELSE 0 END) AS r1,
              SUM(CASE WHEN rating = 2 THEN 1 ELSE 0 END) AS r2,
              SUM(CASE WHEN rating = 3 THEN 1 ELSE 0 END) AS r3,
              SUM(CASE WHEN rating = 4 THEN 1 ELSE 0 END) AS r4,
              SUM(CASE WHEN rating = 5 THEN 1 ELSE 0 END) AS r5
       FROM product_reviews
       WHERE product_id = ? AND status = 'APPROVED' AND is_active = 1`,
      [productId],
    );
    const row = (rows as any[])[0] || {};
    return {
      average: Number(row.average_rating || 0),
      total: Number(row.total_count || 0),
      star: {
        1: Number(row.r1 || 0),
        2: Number(row.r2 || 0),
        3: Number(row.r3 || 0),
        4: Number(row.r4 || 0),
        5: Number(row.r5 || 0),
      },
    };
  },

  async getAdminStatistics() {
    const [rows] = await pool.query(
      `SELECT
         COUNT(*) AS total,
         SUM(status = 'PENDING') AS pending,
         SUM(status = 'APPROVED') AS approved,
         SUM(status = 'REJECTED') AS rejected,
         SUM(status = 'HIDDEN') AS hidden
       FROM product_reviews WHERE is_active = 1`,
    );
    return (rows as any[])[0] || {};
  },

  async userHasPurchasedProduct(userId: number, productId: number, orderId?: number) {
    const clauses = ['o.user_id = ?', 'pv.product_id = ?', "o.status IN ('DELIVERED', 'COMPLETED')"];
    const params: unknown[] = [userId, productId];
    if (orderId) {
      clauses.push('o.id = ?');
      params.push(orderId);
    }
    const [rows] = await pool.query(
      `SELECT o.id FROM orders o
       INNER JOIN order_items oi ON oi.order_id = o.id
       INNER JOIN product_variants pv ON pv.id = oi.variant_id
       WHERE ${clauses.join(' AND ')} LIMIT 1`,
      params,
    );
    return (rows as any[]).length > 0;
  },

  async create(input: {
    productId: number;
    userId: number;
    orderId?: number | null;
    rating: number;
    title?: string | null;
    content: string;
    isVerified: boolean;
    status?: ReviewStatus;
  }) {
    const [result] = await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, order_id, rating, title, content, comment, is_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.productId,
        input.userId,
        input.orderId ?? null,
        input.rating,
        input.title ?? null,
        input.content,
        input.content,
        input.isVerified ? 1 : 0,
        input.status ?? 'PENDING',
      ],
    );
    return this.getById((result as any).insertId);
  },

  async attachImages(reviewId: number, images: Array<{ url: string; uploadId?: number | null }>) {
    let order = 0;
    for (const img of images) {
      await pool.query(
        `INSERT INTO review_images (review_id, upload_id, image_url, sort_order) VALUES (?, ?, ?, ?)`,
        [reviewId, img.uploadId ?? null, img.url, order++],
      );
    }
  },

  async update(id: number, input: Partial<{ rating: number; title: string | null; content: string; status: ReviewStatus; adminNote: string | null; isActive: boolean; isVerified: boolean }>) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (typeof input.rating !== 'undefined') {
      updates.push('rating = ?');
      params.push(input.rating);
    }
    if (typeof input.title !== 'undefined') {
      updates.push('title = ?');
      params.push(input.title);
    }
    if (typeof input.content !== 'undefined') {
      updates.push('content = ?', 'comment = ?');
      params.push(input.content, input.content);
    }
    if (typeof input.status !== 'undefined') {
      updates.push('status = ?');
      params.push(input.status);
    }
    if (typeof input.adminNote !== 'undefined') {
      updates.push('admin_note = ?');
      params.push(input.adminNote);
    }
    if (typeof input.isActive !== 'undefined') {
      updates.push('is_active = ?');
      params.push(input.isActive ? 1 : 0);
    }
    if (typeof input.isVerified !== 'undefined') {
      updates.push('is_verified = ?');
      params.push(input.isVerified ? 1 : 0);
    }
    if (!updates.length) return this.getById(id);
    await pool.query(`UPDATE product_reviews SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      ...params,
      id,
    ]);
    return this.getById(id);
  },

  async softDelete(id: number) {
    await pool.query(`UPDATE product_reviews SET is_active = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  async deleteImage(reviewId: number, imageId: number) {
    const [result] = await pool.query(`DELETE FROM review_images WHERE id = ? AND review_id = ?`, [imageId, reviewId]);
    return (result as any).affectedRows > 0;
  },

  /** Mỗi user chỉ thêm được 1 lần (PK user_id + review_id). Trả true nếu vừa thích mới. */
  async addLike(userId: number, reviewId: number) {
    if (await this.isLikedByUser(userId, reviewId)) {
      await this.syncLikeCount(reviewId);
      return false;
    }
    try {
      await pool.query(`INSERT INTO review_likes (user_id, review_id) VALUES (?, ?)`, [userId, reviewId]);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        await this.syncLikeCount(reviewId);
        return false;
      }
      throw err;
    }
    await this.syncLikeCount(reviewId);
    return true;
  },

  async removeLike(userId: number, reviewId: number) {
    const [result] = await pool.query(`DELETE FROM review_likes WHERE user_id = ? AND review_id = ?`, [userId, reviewId]);
    await this.syncLikeCount(reviewId);
    return (result as any).affectedRows > 0;
  },

  async syncLikeCount(reviewId: number) {
    await pool.query(
      `UPDATE product_reviews r
       SET r.like_count = (SELECT COUNT(*) FROM review_likes rl WHERE rl.review_id = r.id)
       WHERE r.id = ?`,
      [reviewId],
    );
  },

  async isLikedByUser(userId: number, reviewId: number) {
    const [rows] = await pool.query(`SELECT 1 FROM review_likes WHERE user_id = ? AND review_id = ?`, [userId, reviewId]);
    return (rows as any[]).length > 0;
  },

};
