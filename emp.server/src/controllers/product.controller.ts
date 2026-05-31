import { Request, Response } from 'express';
import { productService } from '../services/product.service';
import { uploadService } from '../services/upload.service';
import {
  mergeProductImageUrls,
  parseProductImageUrlsField,
} from '../lib/parse-product-image-urls';
import { sendError, sendSuccess } from '../utils/api-response';

const collectUploadedFiles = (req: Request): Express.Multer.File[] => {
  const files: Express.Multer.File[] = [];
  if (req.file) files.push(req.file);

  const grouped = req.files as Record<string, Express.Multer.File[]> | undefined;
  if (grouped?.images?.length) files.push(...grouped.images);
  if (grouped?.image?.length) files.push(...grouped.image);

  return files;
};

const resolveUploadedImageUrls = async (req: Request): Promise<string[]> => {
  const files = collectUploadedFiles(req);
  if (files.length === 0) return [];
  const saved = await uploadService.saveFiles(req.user?.id ?? null, files);
  return saved.map((item) => item.url).filter(Boolean);
};

const getIdOrSlugParam = (req: Request): string => {
  const value = req.params.idOrSlug;
  return Array.isArray(value) ? value[0] : value;
};

const isAdminProductScope = (req: Request) =>
  Boolean(
    req.user?.permissions?.includes('products.view') ||
      req.user?.permissions?.includes('products.update') ||
      req.user?.permissions?.includes('products.delete'),
  );

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'PRODUCT_NOT_FOUND') return { status: 404, message: 'Product not found', errorCode: 'PRODUCT_NOT_FOUND' };
  if (message.startsWith('MISSING_'))
    return { status: 400, message: message.replace('MISSING_', 'Missing '), errorCode: message };
  if (message === 'INVALID_CATEGORY_ID')
    return { status: 400, message: 'categoryId must be a positive integer', errorCode: 'INVALID_CATEGORY_ID' };
  if (message === 'INVALID_BRAND_ID')
    return { status: 400, message: 'brandId must be a positive integer', errorCode: 'INVALID_BRAND_ID' };
  if (message === 'INVALID_BASE_PRICE')
    return { status: 400, message: 'basePrice must be a non-negative number', errorCode: 'INVALID_BASE_PRICE' };
  if (message === 'INVALID_CATEGORY_OR_BRAND')
    return {
      status: 400,
      message: 'categoryId or brandId does not exist',
      errorCode: 'INVALID_CATEGORY_OR_BRAND',
    };
  if (message === 'DUPLICATE_PRODUCT_SLUG')
    return {
      status: 409,
      message: 'Đường dẫn sản phẩm (slug) đã tồn tại. Hệ thống sẽ tự thêm hậu tố — thử lưu lại.',
      errorCode: 'DUPLICATE_PRODUCT_SLUG',
    };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const productController = {
  async list(req: Request, res: Response) {
    try {
      const query = { ...(req.query as Record<string, unknown>) };
      if (isAdminProductScope(req)) {
        query.includeInactive = true;
      }
      const data = await productService.list(query);
      return sendSuccess(res, 200, 'Product list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const data = await productService.detail(getIdOrSlugParam(req), isAdminProductScope(req));
      return sendSuccess(res, 200, 'Product detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const payload = { ...(req.body as Record<string, unknown>) };
      const uploadedUrls = await resolveUploadedImageUrls(req);
      const imageUrls = mergeProductImageUrls(parseProductImageUrlsField(payload), uploadedUrls);
      if (imageUrls.length > 0) {
        payload.thumbnailUrl = imageUrls[0];
        payload.imageUrls = imageUrls;
      } else if (typeof payload.thumbnailUrl === 'undefined' && typeof payload.imageUrl !== 'undefined') {
        payload.thumbnailUrl = payload.imageUrl;
      }
      const data = await productService.create(payload);
      return sendSuccess(res, 201, 'Product created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const payload = { ...(req.body as Record<string, unknown>) };
      const uploadedUrls = await resolveUploadedImageUrls(req);
      const hasImageField =
        typeof payload.imageUrls !== 'undefined' ||
        typeof payload.imageUrl !== 'undefined' ||
        typeof payload.thumbnailUrl !== 'undefined' ||
        uploadedUrls.length > 0;

      if (hasImageField) {
        const imageUrls = mergeProductImageUrls(parseProductImageUrlsField(payload), uploadedUrls);
        payload.imageUrls = imageUrls;
        payload.thumbnailUrl = imageUrls[0] ?? null;
      }
      const data = await productService.update(getIdOrSlugParam(req), payload);
      return sendSuccess(res, 200, 'Product updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await productService.remove(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Product deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async related(req: Request, res: Response) {
    try {
      const data = await productService.related(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Related products fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async addRelated(req: Request, res: Response) {
    try {
      const data = await productService.addRelated(getIdOrSlugParam(req), req.body);
      return sendSuccess(res, 200, 'Related product added successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async removeRelated(req: Request, res: Response) {
    try {
      const data = await productService.removeRelated(getIdOrSlugParam(req), req.body);
      return sendSuccess(res, 200, 'Related product removed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};

