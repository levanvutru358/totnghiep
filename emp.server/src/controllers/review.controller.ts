import { Request, Response } from 'express';
import { reviewService } from '../services/review.service';
import { uploadService } from '../services/upload.service';
import { sendError, sendSuccess } from '../utils/api-response';

const requireUser = (req: Request) => {
  if (!req.user) throw new Error('UNAUTHORIZED');
  return req.user;
};

const getParam = (req: Request, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
};

const getReviewId = (req: Request) => Number(getParam(req, 'reviewId'));

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const map: Record<string, { status: number; message: string }> = {
    UNAUTHORIZED: { status: 401, message: 'Unauthorized' },
    PRODUCT_NOT_FOUND: { status: 404, message: 'Product not found' },
    REVIEW_NOT_FOUND: { status: 404, message: 'Review not found' },
    REVIEW_IMAGE_NOT_FOUND: { status: 404, message: 'Review image not found' },
    FORBIDDEN_REVIEW_ACTION: { status: 403, message: 'Forbidden' },
    REVIEW_ALREADY_EXISTS: { status: 409, message: 'Review already exists' },
    REVIEW_NOT_EDITABLE: { status: 400, message: 'Review not editable' },
    INVALID_RATING: { status: 400, message: 'Invalid rating' },
    INVALID_CONTENT: { status: 400, message: 'Invalid content' },
    INVALID_PRODUCT_ID: { status: 400, message: 'Invalid productId' },
    NO_FILES_UPLOADED: { status: 400, message: 'No files uploaded' },
  };
  if (map[message]) return { ...map[message], errorCode: message };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

const handle = async (res: Response, fn: () => Promise<unknown>, code = 200, msg = 'OK') => {
  try {
    const data = await fn();
    return sendSuccess(res, code, msg, data);
  } catch (error) {
    const mapped = mapError(error);
    return sendError(res, mapped.status, mapped.message, mapped.errorCode);
  }
};

export const reviewController = {
  create: (req: Request, res: Response) =>
    handle(res, () => reviewService.create(requireUser(req).id, req.body), 201, 'Review created'),

  upload: (req: Request, res: Response) =>
    handle(res, async () => {
      const user = requireUser(req);
      const files = (req.files as Express.Multer.File[]) ?? [];
      const saved = await uploadService.saveFiles(user.id, files);
      return {
        images: saved.map((f: any) => ({ id: Number(f.id), url: f.url })),
      };
    }, 201, 'Images uploaded'),

  listByProduct: (req: Request, res: Response) =>
    handle(res, () =>
      reviewService.listByProduct(getParam(req, 'productId'), req.query as Record<string, unknown>, req.user?.id),
    ),

  statistics: (req: Request, res: Response) =>
    handle(res, () => reviewService.statistics(getParam(req, 'productId')), 200, 'Statistics fetched'),

  detail: (req: Request, res: Response) =>
    handle(res, () => reviewService.detail(getReviewId(req), req.user?.id)),

  update: (req: Request, res: Response) =>
    handle(res, () => reviewService.update(requireUser(req).id, getReviewId(req), req.body), 200, 'Review updated'),

  remove: (req: Request, res: Response) =>
    handle(res, async () => {
      await reviewService.remove(requireUser(req).id, getReviewId(req));
      return null;
    }, 200, 'Review deleted'),

  like: (req: Request, res: Response) =>
    handle(res, () => reviewService.like(requireUser(req).id, getReviewId(req)), 200, 'Review liked'),

  unlike: (req: Request, res: Response) =>
    handle(res, () => reviewService.unlike(requireUser(req).id, getReviewId(req)), 200, 'Review unliked'),

  deleteImage: (req: Request, res: Response) =>
    handle(res, async () => {
      await reviewService.deleteImage(requireUser(req).id, getReviewId(req), Number(req.params.imageId));
      return null;
    }, 200, 'Image deleted'),

  listMine: (req: Request, res: Response) =>
    handle(res, () => reviewService.listMine(requireUser(req).id, req.query as Record<string, unknown>)),

  listAdmin: (req: Request, res: Response) => handle(res, () => reviewService.listAdmin(req.query as Record<string, unknown>)),

  detailAdmin: (req: Request, res: Response) => handle(res, () => reviewService.detail(getReviewId(req), undefined, true)),

  approve: (req: Request, res: Response) =>
    handle(res, () => reviewService.setStatus(getReviewId(req), 'APPROVED', req.body?.adminNote), 200, 'Review approved'),

  reject: (req: Request, res: Response) =>
    handle(res, () => reviewService.setStatus(getReviewId(req), 'REJECTED', req.body?.adminNote), 200, 'Review rejected'),

  hide: (req: Request, res: Response) =>
    handle(res, () => reviewService.setStatus(getReviewId(req), 'HIDDEN', req.body?.adminNote), 200, 'Review hidden'),

  removeAdmin: (req: Request, res: Response) =>
    handle(res, async () => {
      await reviewService.removeAdmin(getReviewId(req));
      return null;
    }),

  adminStatistics: (req: Request, res: Response) => handle(res, () => reviewService.adminStatistics()),
};
