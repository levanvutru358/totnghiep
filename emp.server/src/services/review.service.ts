import {
  MAX_REVIEW_CONTENT_LENGTH,
  MAX_REVIEW_RATING,
  MAX_REVIEW_TITLE_LENGTH,
  MIN_REVIEW_CONTENT_LENGTH,
  MIN_REVIEW_RATING,
  REVIEW_STATUSES,
  type ReviewStatus,
} from '../constants/reviews';
import { productRepository } from '../repositories/product.repository';
import { reviewRepository } from '../repositories/review.repository';
import { resolveUploadImages } from '../lib/resolve-upload-images';
import { notificationRepository } from '../repositories/notification.repository';

const toPositive = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const isStatus = (v: unknown): v is ReviewStatus =>
  typeof v === 'string' && (REVIEW_STATUSES as readonly string[]).includes(v);

const parseRating = (v: unknown) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < MIN_REVIEW_RATING || n > MAX_REVIEW_RATING) throw new Error('INVALID_RATING');
  return n;
};

const parseContent = (v: unknown) => {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < MIN_REVIEW_CONTENT_LENGTH || s.length > MAX_REVIEW_CONTENT_LENGTH) throw new Error('INVALID_CONTENT');
  return s;
};

const resolveProductId = async (id: string | number) => {
  const product = await productRepository.getByIdOrSlug(String(id));
  if (!product) throw new Error('PRODUCT_NOT_FOUND');
  return Number(product.id);
};

const mapReview = async (
  row: any,
  viewerId?: number,
  options?: { includeAdmin?: boolean; images?: any[] },
) => {
  const images = options?.images ?? (await reviewRepository.getImages(row.id));
  const liked = viewerId ? await reviewRepository.isLikedByUser(viewerId, row.id) : false;
  return {
    id: Number(row.id),
    productId: Number(row.product_id),
    productName: row.product_name,
    userId: Number(row.user_id),
    userName: row.user_name || 'Khách hàng',
    userEmail: options?.includeAdmin ? row.user_email : undefined,
    orderId: row.order_id ? Number(row.order_id) : null,
    rating: Number(row.rating),
    title: row.title ?? null,
    content: row.content,
    status: row.status as ReviewStatus,
    adminNote: options?.includeAdmin ? row.admin_note ?? null : undefined,
    verified: Boolean(row.is_verified),
    likeCount: Number(row.like_count || 0),
    liked,
    images: images.map((img: any) => ({
      id: Number(img.id),
      url: img.image_url,
      uploadId: img.upload_id ? Number(img.upload_id) : null,
    })),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

export const reviewService = {
  async create(userId: number, body: Record<string, unknown>) {
    const productId = toPositive(body.productId);
    if (!productId) throw new Error('INVALID_PRODUCT_ID');
    const rating = parseRating(body.rating);
    const content = parseContent(body.content ?? body.comment);
    const title =
      typeof body.title === 'string' && body.title.trim()
        ? body.title.trim().slice(0, MAX_REVIEW_TITLE_LENGTH)
        : null;
    const orderId = toPositive(body.orderId);

    const existing = await reviewRepository.getByUserAndProductIncludingInactive(userId, productId);
    if (existing && Number(existing.is_active)) throw new Error('REVIEW_ALREADY_EXISTS');

    const purchased = orderId
      ? await reviewRepository.userHasPurchasedProduct(userId, productId, orderId)
      : await reviewRepository.userHasPurchasedProduct(userId, productId);

    const images = await resolveUploadImages(userId, body.images);

    if (existing && !Number(existing.is_active)) {
      const reviewId = Number(existing.id);
      const restored = await reviewRepository.update(reviewId, {
        rating,
        title,
        content,
        status: 'APPROVED',
        isActive: true,
        isVerified: purchased,
        adminNote: null,
      });
      await reviewRepository.clearImages(reviewId);
      if (images.length) await reviewRepository.attachImages(reviewId, images);
      return mapReview(restored, userId);
    }

    const created = await reviewRepository.create({
      productId,
      userId,
      orderId: orderId ?? null,
      rating,
      title,
      content,
      isVerified: purchased,
      status: 'APPROVED',
    });

    if (images.length) await reviewRepository.attachImages(Number(created.id), images);

    return mapReview(created, userId);
  },

  async listByProduct(productIdParam: string | number, query: Record<string, unknown>, viewerId?: number) {
    const productId = await resolveProductId(productIdParam);
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 10, 50);
    const sort = ['newest', 'oldest', 'rating_high', 'rating_low'].includes(String(query.sort))
      ? (query.sort as 'newest' | 'oldest' | 'rating_high' | 'rating_low')
      : 'newest';

    const result = await reviewRepository.list({
      productId,
      rating: toPositive(query.rating),
      publicOnly: true,
      hasImage: query.hasImage === 'true' || query.hasImage === true,
      verified: query.verified === 'true' || query.verified === true,
      page,
      limit,
      sort,
    });

    const reviewIds = result.items.map((row) => Number(row.id));
    const imagesMap = await reviewRepository.getImagesByReviewIds(reviewIds);
    const items = await Promise.all(
      result.items.map((row) => mapReview(row, viewerId, { images: imagesMap.get(Number(row.id)) ?? [] })),
    );
    return { ...result, items };
  },

  async statistics(productIdParam: string | number) {
    const productId = await resolveProductId(productIdParam);
    return reviewRepository.getStatistics(productId);
  },

  async detail(reviewId: number, viewerId?: number, admin = false) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || !row.is_active) throw new Error('REVIEW_NOT_FOUND');
    const isOwner = viewerId && Number(row.user_id) === viewerId;
    if (!admin && !isOwner && row.status !== 'APPROVED') throw new Error('REVIEW_NOT_FOUND');
    return mapReview(row, viewerId ?? undefined);
  },

  async listMine(userId: number, query: Record<string, unknown>) {
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 50);
    const result = await reviewRepository.list({ userId, page, limit, sort: 'newest' });
    const reviewIds = result.items.map((row) => Number(row.id));
    const imagesMap = await reviewRepository.getImagesByReviewIds(reviewIds);
    const items = await Promise.all(
      result.items.map((row) => mapReview(row, userId, { images: imagesMap.get(Number(row.id)) ?? [] })),
    );
    return { ...result, items };
  },

  async update(userId: number, reviewId: number, body: Record<string, unknown>) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || !row.is_active) throw new Error('REVIEW_NOT_FOUND');
    if (Number(row.user_id) !== userId) throw new Error('FORBIDDEN_REVIEW_ACTION');
    const patch: Parameters<typeof reviewRepository.update>[1] = {
      status: row.status === 'HIDDEN' ? 'HIDDEN' : 'APPROVED',
    };
    if (typeof body.rating !== 'undefined') patch.rating = parseRating(body.rating);
    if (typeof body.content !== 'undefined') patch.content = parseContent(body.content);
    if (typeof body.title !== 'undefined') {
      patch.title =
        typeof body.title === 'string' && body.title.trim()
          ? body.title.trim().slice(0, MAX_REVIEW_TITLE_LENGTH)
          : null;
    }
    await reviewRepository.update(reviewId, patch);
    const images = await resolveUploadImages(userId, body.images);
    if (images.length) await reviewRepository.attachImages(reviewId, images);
    const fresh = await reviewRepository.getById(reviewId);
    return mapReview(fresh, userId);
  },

  async remove(userId: number, reviewId: number) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || !row.is_active) throw new Error('REVIEW_NOT_FOUND');
    if (Number(row.user_id) !== userId) throw new Error('FORBIDDEN_REVIEW_ACTION');
    await reviewRepository.softDelete(reviewId);
  },

  async like(userId: number, reviewId: number) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || row.status !== 'APPROVED') throw new Error('REVIEW_NOT_FOUND');
    const isNewLike = await reviewRepository.addLike(userId, reviewId);
    if (isNewLike && Number(row.user_id) !== userId) {
      await notificationRepository.create({
        userId: Number(row.user_id),
        type: 'REVIEW_LIKE',
        title: 'Có người thích đánh giá của bạn',
        referenceType: 'REVIEW',
        referenceId: reviewId,
      });
    }
    const fresh = await reviewRepository.getById(reviewId);
    return mapReview(fresh, userId);
  },

  async unlike(userId: number, reviewId: number) {
    await reviewRepository.removeLike(userId, reviewId);
    const row = await reviewRepository.getById(reviewId);
    if (!row) throw new Error('REVIEW_NOT_FOUND');
    return mapReview(row, userId);
  },

  async deleteImage(userId: number, reviewId: number, imageId: number) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || Number(row.user_id) !== userId) throw new Error('FORBIDDEN_REVIEW_ACTION');
    const ok = await reviewRepository.deleteImage(reviewId, imageId);
    if (!ok) throw new Error('REVIEW_IMAGE_NOT_FOUND');
  },

  async listAdmin(query: Record<string, unknown>) {
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 100);
    let status: ReviewStatus | undefined;
    const rawStatus = String(query.status ?? '').toLowerCase();
    if (rawStatus === 'pending') status = 'PENDING';
    else if (rawStatus === 'approved') status = 'APPROVED';
    else if (rawStatus === 'rejected') status = 'REJECTED';
    else if (rawStatus === 'hidden') status = 'HIDDEN';
    else if (isStatus(query.status)) status = query.status;

    const result = await reviewRepository.list({
      productId: toPositive(query.productId),
      status,
      rating: toPositive(query.rating),
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit,
    });
    const items = await Promise.all(result.items.map((row) => mapReview(row, undefined, { includeAdmin: true })));
    return { ...result, items };
  },

  async setStatus(reviewId: number, status: ReviewStatus, adminNote?: string | null) {
    const row = await reviewRepository.getById(reviewId);
    if (!row || !row.is_active) throw new Error('REVIEW_NOT_FOUND');
    const updated = await reviewRepository.update(reviewId, { status, adminNote: adminNote ?? null });
    if (status === 'APPROVED') {
      await notificationRepository.create({
        userId: Number(row.user_id),
        type: 'REVIEW_APPROVED',
        title: 'Đánh giá của bạn đã được duyệt',
        referenceType: 'REVIEW',
        referenceId: reviewId,
      });
    }
    return mapReview(updated);
  },

  async removeAdmin(reviewId: number) {
    const row = await reviewRepository.getById(reviewId);
    if (!row) throw new Error('REVIEW_NOT_FOUND');
    await reviewRepository.softDelete(reviewId);
  },

  async adminStatistics() {
    const row = await reviewRepository.getAdminStatistics();
    return {
      total: Number(row.total || 0),
      pending: Number(row.pending || 0),
      approved: Number(row.approved || 0),
      rejected: Number(row.rejected || 0),
      hidden: Number(row.hidden || 0),
    };
  },
};
