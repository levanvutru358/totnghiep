import { Request, Response } from 'express';
import { brandService } from '../services/brand.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getIdOrSlugParam = (req: Request): string => {
  const value = req.params.idOrSlug;
  return Array.isArray(value) ? value[0] : value;
};

const mapError = (error: unknown): { status: number; message: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'BRAND_NOT_FOUND') return { status: 404, message: 'Brand not found' };
  if (message.startsWith('MISSING_')) return { status: 400, message: message.replace('MISSING_', 'Missing ') };
  return { status: 500, message: 'Internal server error' };
};

export const brandController = {
  async list(req: Request, res: Response) {
    try {
      const data = await brandService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Brand list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const data = await brandService.detail(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Brand detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await brandService.create(req.body);
      return sendSuccess(res, 201, 'Brand created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const data = await brandService.update(getIdOrSlugParam(req), req.body);
      return sendSuccess(res, 200, 'Brand updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await brandService.remove(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Brand deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },
};
