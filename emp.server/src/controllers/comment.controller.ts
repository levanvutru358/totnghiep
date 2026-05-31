import { Request, Response } from 'express';
import { commentService } from '../services/comment.service';
import { uploadService } from '../services/upload.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getParam = (req: Request, key: string): string => {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
};

const requireUser = (req: Request) => {
  if (!req.user) throw new Error('UNAUTHORIZED');
  return req.user;
};

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const codes: Record<string, number> = {
    UNAUTHORIZED: 401,
    PRODUCT_NOT_FOUND: 404,
    COMMENT_NOT_FOUND: 404,
    FORBIDDEN_COMMENT_ACTION: 403,
    INVALID_CONTENT: 400,
    INVALID_PRODUCT_ID: 400,
    INVALID_PARENT_ID: 400,
    INVALID_MENTION: 400,
    NO_FILES_UPLOADED: 400,
    COMMENT_IMAGE_NOT_FOUND: 404,
  };
  if (codes[message]) return { status: codes[message], message: message.replace(/_/g, ' ').toLowerCase(), errorCode: message };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

const handle = async (res: Response, fn: () => Promise<unknown>, code = 200, msg = 'OK') => {
  try {
    return sendSuccess(res, code, msg, await fn());
  } catch (e) {
    const m = mapError(e);
    return sendError(res, m.status, m.message, m.errorCode);
  }
};

export const commentController = {
  create: (req: Request, res: Response) => handle(res, () => commentService.create(requireUser(req).id, req.body), 201, 'Comment created'),
  upload: (req: Request, res: Response) =>
    handle(
      res,
      async () => {
        const user = requireUser(req);
        const files = (req.files as Express.Multer.File[]) ?? [];
        const saved = await uploadService.saveFiles(user.id, files);
        return { images: saved.map((f: { id: number; url: string }) => ({ id: Number(f.id), url: f.url })) };
      },
      201,
      'Images uploaded',
    ),
  reply: (req: Request, res: Response) => handle(res, () => commentService.reply(requireUser(req).id, req.body), 201, 'Reply created'),
  listByProduct: (req: Request, res: Response) =>
    handle(res, () => commentService.listByProduct(getParam(req, 'productId'), req.query as Record<string, unknown>, req.user?.id)),
  detail: (req: Request, res: Response) => handle(res, () => commentService.detail(Number(req.params.commentId), req.user?.id)),
  listReplies: (req: Request, res: Response) =>
    handle(res, () => commentService.listReplies(Number(req.params.commentId), req.query as Record<string, unknown>, req.user?.id)),
  update: (req: Request, res: Response) =>
    handle(res, () => commentService.update(requireUser(req).id, Number(req.params.commentId), req.body)),
  remove: (req: Request, res: Response) =>
    handle(res, async () => {
      await commentService.remove(requireUser(req).id, Number(req.params.commentId));
      return null;
    }),
  deleteImage: (req: Request, res: Response) =>
    handle(res, async () => {
      await commentService.deleteImage(requireUser(req).id, Number(req.params.commentId), Number(req.params.imageId));
      return null;
    }, 200, 'Image deleted'),
  like: (req: Request, res: Response) => handle(res, () => commentService.like(requireUser(req).id, Number(req.params.commentId))),
  unlike: (req: Request, res: Response) => handle(res, () => commentService.unlike(requireUser(req).id, Number(req.params.commentId))),
  mention: (req: Request, res: Response) => handle(res, () => commentService.mention(requireUser(req).id, req.body)),
  listAdmin: (req: Request, res: Response) => handle(res, () => commentService.listAdmin(req.query as Record<string, unknown>)),
  hide: (req: Request, res: Response) => handle(res, () => commentService.setVisibility(Number(req.params.commentId), 'HIDDEN')),
  show: (req: Request, res: Response) => handle(res, () => commentService.setVisibility(Number(req.params.commentId), 'VISIBLE')),
  removeAdmin: (req: Request, res: Response) =>
    handle(res, async () => {
      await commentService.removeAdmin(Number(req.params.commentId));
      return null;
    }),
};
