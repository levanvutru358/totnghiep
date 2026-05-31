import { NextFunction, Request, Response } from 'express';
import { bumpPublicContentRevision } from '../services/public-revision.service';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/** API admin thay đổi nội dung hiển thị trên shop → client tự reload. */
const TRACKED_PREFIXES = [
  '/api/admin/marketing',
  '/api/products',
  '/api/categories',
  '/api/brands',
  '/api/variants',
  '/api/inventory',
  '/api/upload',
  '/api/admin/promotions',
  '/api/admin/settings',
];

const shouldTrackRequest = (req: Request): boolean => {
  if (!MUTATING_METHODS.has(req.method)) return false;
  const path = req.originalUrl.split('?')[0] ?? '';
  return TRACKED_PREFIXES.some((prefix) => path.startsWith(prefix));
};

export const bumpPublicContentOnAdminWrite = (req: Request, res: Response, next: NextFunction) => {
  if (!shouldTrackRequest(req)) {
    next();
    return;
  }

  res.on('finish', () => {
    if (res.statusCode >= 200 && res.statusCode < 300) {
      bumpPublicContentRevision();
    }
  });

  next();
};
