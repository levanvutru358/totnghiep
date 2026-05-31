import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getIdOrSlugParam = (req: Request): string => {
  const value = req.params.idOrSlug;
  return Array.isArray(value) ? value[0] : value;
};

const mapError = (error: unknown): { status: number; message: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'CATEGORY_NOT_FOUND') return { status: 404, message: 'Category not found' };
  if (message.startsWith('MISSING_')) return { status: 400, message: message.replace('MISSING_', 'Missing ') };
  return { status: 500, message: 'Internal server error' };
};

export const categoryController = {
  async list(req: Request, res: Response) {
    try {
      const data = await categoryService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Category list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const data = await categoryService.detail(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Category detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await categoryService.create(req.body);
      return sendSuccess(res, 201, 'Category created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const data = await categoryService.update(getIdOrSlugParam(req), req.body);
      return sendSuccess(res, 200, 'Category updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      await categoryService.remove(getIdOrSlugParam(req));
      return sendSuccess(res, 200, 'Category deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message);
    }
  },
};
