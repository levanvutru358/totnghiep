import { Request, Response } from 'express';
import { variantService } from '../services/variant.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'VARIANT_NOT_FOUND')
    return { status: 404, message: 'Variant not found', errorCode: 'VARIANT_NOT_FOUND' };
  if (message.startsWith('MISSING_'))
    return { status: 400, message: message.replace('MISSING_', 'Missing '), errorCode: message };
  if (message === 'INVALID_VARIANT_ID')
    return { status: 400, message: 'id must be a positive integer', errorCode: 'INVALID_VARIANT_ID' };
  if (message === 'INVALID_VARIANT_IDS')
    return {
      status: 400,
      message: 'productId, sizeId and colorId must be positive integers',
      errorCode: 'INVALID_VARIANT_IDS',
    };
  if (message === 'INVALID_STOCK_FIELDS')
    return {
      status: 400,
      message: 'stockQuantity and minStockThreshold must be finite numbers',
      errorCode: 'INVALID_STOCK_FIELDS',
    };
  if (message === 'INVALID_PRICE')
    return { status: 400, message: 'price must be a finite number or null', errorCode: 'INVALID_PRICE' };
  if (message === 'VARIANT_ALREADY_EXISTS')
    return {
      status: 409,
      message: 'Duplicate SKU or same product/size/color combination',
      errorCode: 'VARIANT_ALREADY_EXISTS',
    };
  if (message === 'INVALID_VARIANT_REFERENCE')
    return {
      status: 400,
      message: 'Invalid product, size or color reference',
      errorCode: 'INVALID_VARIANT_REFERENCE',
    };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const variantController = {
  async list(req: Request, res: Response) {
    try {
      const data = await variantService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Variant list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async detail(req: Request, res: Response) {
    try {
      const data = await variantService.detail(Number(req.params.id));
      return sendSuccess(res, 200, 'Variant detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async create(req: Request, res: Response) {
    try {
      const data = await variantService.create(req.body);
      return sendSuccess(res, 201, 'Variant created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async update(req: Request, res: Response) {
    try {
      const data = await variantService.update(Number(req.params.id), req.body);
      return sendSuccess(res, 200, 'Variant updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await variantService.remove(Number(req.params.id));
      return sendSuccess(res, 200, 'Variant deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async stock(req: Request, res: Response) {
    try {
      const data = await variantService.stock(Number(req.params.id));
      return sendSuccess(res, 200, 'Variant stock fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
