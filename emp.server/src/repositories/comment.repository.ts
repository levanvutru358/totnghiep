import { pool } from '../configs/database.config';
import type { CommentStatus } from '../constants/reviews';

export interface CommentListFilters {
  productId: number;
  parentId?: number | null;
  status?: CommentStatus;
  publicOnly?: boolean;
  page: number;
  limit: number;
  sort?: 'newest' | 'oldest';
}

const commentFrom = `
  FROM product_comments c
  INNER JOIN users u ON u.id = c.user_id
`;

const commentSelect = `
  SELECT c.id, c.product_id, c.user_id, c.parent_id, c.content, c.status,
         (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id) AS like_count,
         c.is_active, c.created_at, c.updated_at,
         u.full_name AS user_name, u.email AS user_email
  ${commentFrom}
`;

export const commentRepository = {
  async list(filters: CommentListFilters) {
    const clauses = ['c.is_active = 1', 'c.product_id = ?'];
    const params: unknown[] = [filters.productId];

    if (typeof filters.parentId !== 'undefined') {
      if (filters.parentId === null) clauses.push('c.parent_id IS NULL');
      else {
        clauses.push('c.parent_id = ?');
        params.push(filters.parentId);
      }
      if (filters.publicOnly) clauses.push("c.status = 'VISIBLE'");
    } else if (filters.publicOnly) {
      clauses.push("c.status = 'VISIBLE'", 'c.parent_id IS NULL');
    }
    if (filters.status) {
      clauses.push('c.status = ?');
      params.push(filters.status);
    }

    const whereSql = clauses.join(' AND ');
    const offset = (filters.page - 1) * filters.limit;
    const order = filters.sort === 'oldest' ? 'c.created_at ASC' : 'c.created_at DESC';

    const [rows] = await pool.query(
      `${commentSelect} WHERE ${whereSql} ORDER BY ${order} LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total ${commentFrom} WHERE ${whereSql}`,
      params,
    );
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page: filters.page, limit: filters.limit, totalPages: Math.max(1, Math.ceil(total / filters.limit)) };
  },

  async getById(id: number) {
    const [rows] = await pool.query(`${commentSelect} WHERE c.id = ? LIMIT 1`, [id]);
    return (rows as any[])[0] || null;
  },

  async create(input: { productId: number; userId: number; parentId?: number | null; content: string; status?: CommentStatus }) {
    const [result] = await pool.query(
      `INSERT INTO product_comments (product_id, user_id, parent_id, content, status) VALUES (?, ?, ?, ?, ?)`,
      [input.productId, input.userId, input.parentId ?? null, input.content, input.status ?? 'VISIBLE'],
    );
    return this.getById((result as any).insertId);
  },

  async update(id: number, input: Partial<{ content: string; status: CommentStatus; isActive: boolean }>) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (typeof input.content !== 'undefined') {
      updates.push('content = ?');
      params.push(input.content);
    }
    if (typeof input.status !== 'undefined') {
      updates.push('status = ?');
      params.push(input.status);
    }
    if (typeof input.isActive !== 'undefined') {
      updates.push('is_active = ?');
      params.push(input.isActive ? 1 : 0);
    }
    if (!updates.length) return this.getById(id);
    await pool.query(`UPDATE product_comments SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [...params, id]);
    return this.getById(id);
  },

  async softDelete(id: number) {
    await pool.query(`UPDATE product_comments SET is_active = 0 WHERE id = ?`, [id]);
  },

  /** Mỗi user chỉ thêm được 1 lần (PK user_id + comment_id). Trả true nếu vừa thích mới. */
  async addLike(userId: number, commentId: number) {
    if (await this.isLikedByUser(userId, commentId)) {
      await this.syncLikeCount(commentId);
      return false;
    }
    try {
      await pool.query(`INSERT INTO comment_likes (user_id, comment_id) VALUES (?, ?)`, [userId, commentId]);
    } catch (err: unknown) {
      if ((err as { code?: string }).code === 'ER_DUP_ENTRY') {
        await this.syncLikeCount(commentId);
        return false;
      }
      throw err;
    }
    await this.syncLikeCount(commentId);
    return true;
  },

  async removeLike(userId: number, commentId: number) {
    const [result] = await pool.query(`DELETE FROM comment_likes WHERE user_id = ? AND comment_id = ?`, [userId, commentId]);
    await this.syncLikeCount(commentId);
    return (result as any).affectedRows > 0;
  },

  async syncLikeCount(commentId: number) {
    await pool.query(
      `UPDATE product_comments c
       SET c.like_count = (SELECT COUNT(*) FROM comment_likes cl WHERE cl.comment_id = c.id)
       WHERE c.id = ?`,
      [commentId],
    );
  },

  async isLikedByUser(userId: number, commentId: number) {
    const [rows] = await pool.query(`SELECT 1 FROM comment_likes WHERE user_id = ? AND comment_id = ?`, [userId, commentId]);
    return (rows as any[]).length > 0;
  },

  async addMention(commentId: number, mentionedUserId: number) {
    await pool.query(
      `INSERT IGNORE INTO comment_mentions (comment_id, mentioned_user_id) VALUES (?, ?)`,
      [commentId, mentionedUserId],
    );
  },

  async getImages(commentId: number) {
    const [rows] = await pool.query(
      `SELECT id, comment_id, upload_id, image_url, sort_order FROM comment_images WHERE comment_id = ? ORDER BY sort_order, id`,
      [commentId],
    );
    return rows as any[];
  },

  async getImagesByCommentIds(commentIds: number[]) {
    const map = new Map<number, any[]>();
    if (!commentIds.length) return map;
    const placeholders = commentIds.map(() => '?').join(',');
    const [rows] = await pool.query(
      `SELECT id, comment_id, upload_id, image_url, sort_order
       FROM comment_images WHERE comment_id IN (${placeholders}) ORDER BY comment_id, sort_order, id`,
      commentIds,
    );
    for (const row of rows as any[]) {
      const commentId = Number(row.comment_id);
      const list = map.get(commentId) ?? [];
      list.push(row);
      map.set(commentId, list);
    }
    return map;
  },

  async attachImages(commentId: number, images: Array<{ url: string; uploadId?: number | null }>) {
    let order = 0;
    for (const img of images) {
      await pool.query(
        `INSERT INTO comment_images (comment_id, upload_id, image_url, sort_order) VALUES (?, ?, ?, ?)`,
        [commentId, img.uploadId ?? null, img.url, order++],
      );
    }
  },

  async clearImages(commentId: number) {
    await pool.query(`DELETE FROM comment_images WHERE comment_id = ?`, [commentId]);
  },

  async deleteImage(commentId: number, imageId: number) {
    const [result] = await pool.query(`DELETE FROM comment_images WHERE id = ? AND comment_id = ?`, [imageId, commentId]);
    return (result as any).affectedRows > 0;
  },
};
