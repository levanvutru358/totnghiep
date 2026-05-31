import { COMMENT_STATUSES, type CommentStatus } from '../constants/reviews';
import { resolveUploadImages } from '../lib/resolve-upload-images';
import { productRepository } from '../repositories/product.repository';
import { commentRepository } from '../repositories/comment.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { userRepository } from '../repositories/user.repository';
import { pool } from '../configs/database.config';

const toPositive = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const parseContent = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < 1 || s.length > 2000) throw new Error('INVALID_CONTENT');
  return s;
};

const mapImageRows = (rows: any[]) =>
  rows.map((img) => ({
    id: Number(img.id),
    url: img.image_url,
    uploadId: img.upload_id ? Number(img.upload_id) : null,
  }));

const mapComment = async (row: any, viewerId?: number, options?: { images?: any[] }) => {
  const imageRows = options?.images ?? (await commentRepository.getImages(Number(row.id)));
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    userId: Number(row.user_id),
    userName: row.user_name || 'Khách',
    parentId: row.parent_id ? Number(row.parent_id) : null,
    content: row.content,
    status: row.status as CommentStatus,
    likeCount: Number(row.like_count ?? 0),
    liked: viewerId ? await commentRepository.isLikedByUser(viewerId, Number(row.id)) : false,
    images: mapImageRows(imageRows),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const commentService = {
  async create(userId: number, body: Record<string, unknown>) {
    const productId = toPositive(body.productId);
    if (!productId) throw new Error('INVALID_PRODUCT_ID');
    const product = await productRepository.getByIdOrSlug(String(productId));
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    const content = parseContent(body.content);
    const created = await commentRepository.create({ productId, userId, content });
    const images = await resolveUploadImages(userId, body.images);
    if (images.length) await commentRepository.attachImages(Number(created.id), images);
    return mapComment(created, userId);
  },

  async reply(userId: number, body: Record<string, unknown>) {
    const parentId = toPositive(body.parentId);
    if (!parentId) throw new Error('INVALID_PARENT_ID');
    const parent = await commentRepository.getById(parentId);
    if (!parent || !parent.is_active) throw new Error('COMMENT_NOT_FOUND');
    const content = parseContent(body.content);
    const created = await commentRepository.create({
      productId: Number(parent.product_id),
      userId,
      parentId,
      content,
    });
    const images = await resolveUploadImages(userId, body.images);
    if (images.length) await commentRepository.attachImages(Number(created.id), images);
    if (Number(parent.user_id) !== userId) {
      await notificationRepository.create({
        userId: Number(parent.user_id),
        type: 'COMMENT_REPLY',
        title: 'Có phản hồi bình luận của bạn',
        referenceType: 'COMMENT',
        referenceId: parentId,
      });
    }
    return mapComment(created, userId);
  },

  async listByProduct(productIdParam: string | number, query: Record<string, unknown>, viewerId?: number) {
    const product = await productRepository.getByIdOrSlug(String(productIdParam));
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 50);
    const result = await commentRepository.list({
      productId: Number(product.id),
      publicOnly: true,
      page,
      limit,
      sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    });
    const commentIds = result.items.map((row) => Number(row.id));
    const imagesMap = await commentRepository.getImagesByCommentIds(commentIds);
    const items = await Promise.all(
      result.items.map((row) => mapComment(row, viewerId, { images: imagesMap.get(Number(row.id)) ?? [] })),
    );
    return { ...result, items };
  },

  async detail(commentId: number, viewerId?: number) {
    const row = await commentRepository.getById(commentId);
    if (!row || !row.is_active) throw new Error('COMMENT_NOT_FOUND');
    if (row.status !== 'VISIBLE' && (!viewerId || Number(row.user_id) !== viewerId)) {
      throw new Error('COMMENT_NOT_FOUND');
    }
    return mapComment(row, viewerId);
  },

  async listReplies(commentId: number, query: Record<string, unknown>, viewerId?: number) {
    const parent = await commentRepository.getById(commentId);
    if (!parent) throw new Error('COMMENT_NOT_FOUND');
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 50);
    const result = await commentRepository.list({
      productId: Number(parent.product_id),
      parentId: commentId,
      publicOnly: true,
      page,
      limit,
      sort: query.sort === 'oldest' ? 'oldest' : 'newest',
    });
    const commentIds = result.items.map((row) => Number(row.id));
    const imagesMap = await commentRepository.getImagesByCommentIds(commentIds);
    const items = await Promise.all(
      result.items.map((row) => mapComment(row, viewerId, { images: imagesMap.get(Number(row.id)) ?? [] })),
    );
    return { ...result, items };
  },

  async update(userId: number, commentId: number, body: Record<string, unknown>) {
    const row = await commentRepository.getById(commentId);
    if (!row || Number(row.user_id) !== userId) throw new Error('FORBIDDEN_COMMENT_ACTION');
    await commentRepository.update(commentId, { content: parseContent(body.content) });
    const images = await resolveUploadImages(userId, body.images);
    if (images.length) await commentRepository.attachImages(commentId, images);
    const fresh = await commentRepository.getById(commentId);
    return mapComment(fresh, userId);
  },

  async deleteImage(userId: number, commentId: number, imageId: number) {
    const row = await commentRepository.getById(commentId);
    if (!row || Number(row.user_id) !== userId) throw new Error('FORBIDDEN_COMMENT_ACTION');
    const ok = await commentRepository.deleteImage(commentId, imageId);
    if (!ok) throw new Error('COMMENT_IMAGE_NOT_FOUND');
  },

  async remove(userId: number, commentId: number) {
    const row = await commentRepository.getById(commentId);
    if (!row || Number(row.user_id) !== userId) throw new Error('FORBIDDEN_COMMENT_ACTION');
    await commentRepository.softDelete(commentId);
  },

  async like(userId: number, commentId: number) {
    const row = await commentRepository.getById(commentId);
    if (!row || row.status !== 'VISIBLE') throw new Error('COMMENT_NOT_FOUND');
    await commentRepository.addLike(userId, commentId);
    const fresh = await commentRepository.getById(commentId);
    return mapComment(fresh, userId);
  },

  async unlike(userId: number, commentId: number) {
    await commentRepository.removeLike(userId, commentId);
    const row = await commentRepository.getById(commentId);
    if (!row) throw new Error('COMMENT_NOT_FOUND');
    return mapComment(row, userId);
  },

  async mention(userId: number, body: Record<string, unknown>) {
    const commentId = toPositive(body.commentId);
    let mentionedUserId = toPositive(body.userId);
    const mentionHandle = typeof body.username === 'string' ? body.username : typeof body.mention === 'string' ? body.mention : '';
    if (!mentionedUserId && mentionHandle.trim()) {
      const mentionedUser = await userRepository.findByMentionHandle(mentionHandle);
      mentionedUserId = mentionedUser ? Number(mentionedUser.id) : undefined;
    }
    if (!commentId || !mentionedUserId) throw new Error('INVALID_MENTION');
    const row = await commentRepository.getById(commentId);
    if (!row || Number(row.user_id) !== userId) throw new Error('FORBIDDEN_COMMENT_ACTION');
    await commentRepository.addMention(commentId, mentionedUserId);
    await notificationRepository.create({
      userId: mentionedUserId,
      type: 'COMMENT_MENTION',
      title: 'Bạn được nhắc trong bình luận',
      referenceType: 'COMMENT',
      referenceId: commentId,
    });
    return { success: true };
  },

  async listAdmin(query: Record<string, unknown>) {
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 100);
    const [rows] = await pool.query(
      `SELECT c.*, u.full_name AS user_name, p.name AS product_name
       FROM product_comments c
       INNER JOIN users u ON u.id = c.user_id
       INNER JOIN products p ON p.id = c.product_id
       WHERE c.is_active = 1
       ORDER BY c.created_at DESC LIMIT ? OFFSET ?`,
      [limit, (page - 1) * limit],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM product_comments WHERE is_active = 1`);
    const total = Number((countRows as any[])[0]?.total || 0);
    const commentIds = (rows as any[]).map((r) => Number(r.id));
    const imagesMap = await commentRepository.getImagesByCommentIds(commentIds);
    return {
      items: await Promise.all(
        (rows as any[]).map((r) => mapComment(r, undefined, { images: imagesMap.get(Number(r.id)) ?? [] })),
      ),
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  },

  async setVisibility(commentId: number, status: CommentStatus) {
    const row = await commentRepository.getById(commentId);
    if (!row) throw new Error('COMMENT_NOT_FOUND');
    const updated = await commentRepository.update(commentId, { status });
    return mapComment(updated);
  },

  async removeAdmin(commentId: number) {
    await commentRepository.softDelete(commentId);
  },
};
