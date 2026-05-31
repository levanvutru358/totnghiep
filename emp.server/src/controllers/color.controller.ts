import { Request, Response } from 'express';
import { colorService } from '../services/color.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'COLOR_NOT_FOUND') return { status: 404, message: 'Color not found', errorCode: 'COLOR_NOT_FOUND' };
  if (message.startsWith('MISSING_'))
    return { status: 400, message: message.replace('MISSING_', 'Missing '), errorCode: message };
  if (message === 'INVALID_COLOR_ID')
    return { status: 400, message: 'id must be a positive integer', errorCode: 'INVALID_COLOR_ID' };
  if (message === 'INVALID_SORTORDER')
    return { status: 400, message: 'sortOrder must be a finite number', errorCode: 'INVALID_SORTORDER' };
  if (message === 'DUPLICATE_COLOR_NAME')
    return { status: 409, message: 'Color name already exists', errorCode: 'DUPLICATE_COLOR_NAME' };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const colorController = {
  async list(req: Request, res: Response) {
    try {
      const data = await colorService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Color list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async detail(req: Request, res: Response) {
    try {
      const data = await colorService.detail(Number(req.params.id));
      return sendSuccess(res, 200, 'Color detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async create(req: Request, res: Response) {
    try {
      const data = await colorService.create(req.body);
      return sendSuccess(res, 201, 'Color created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async update(req: Request, res: Response) {
    try {
      const data = await colorService.update(Number(req.params.id), req.body);
      return sendSuccess(res, 200, 'Color updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await colorService.remove(Number(req.params.id));
      return sendSuccess(res, 200, 'Color deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
