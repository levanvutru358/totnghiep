import { Request, Response } from 'express';
import { sizeService } from '../services/size.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'SIZE_NOT_FOUND') return { status: 404, message: 'Size not found', errorCode: 'SIZE_NOT_FOUND' };
  if (message.startsWith('MISSING_'))
    return { status: 400, message: message.replace('MISSING_', 'Missing '), errorCode: message };
  if (message === 'INVALID_SORTORDER')
    return { status: 400, message: 'sortOrder must be a finite number', errorCode: 'INVALID_SORTORDER' };
  if (message === 'DUPLICATE_SIZE_LABEL')
    return { status: 409, message: 'Size label already exists', errorCode: 'DUPLICATE_SIZE_LABEL' };
  if (message === 'INVALID_SIZE_ID')
    return { status: 400, message: 'id must be a positive integer', errorCode: 'INVALID_SIZE_ID' };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const sizeController = {
  async list(req: Request, res: Response) {
    try {
      const data = await sizeService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Size list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async detail(req: Request, res: Response) {
    try {
      const data = await sizeService.detail(Number(req.params.id));
      return sendSuccess(res, 200, 'Size detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async create(req: Request, res: Response) {
    try {
      const data = await sizeService.create(req.body);
      return sendSuccess(res, 201, 'Size created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async update(req: Request, res: Response) {
    try {
      const data = await sizeService.update(Number(req.params.id), req.body);
      return sendSuccess(res, 200, 'Size updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async remove(req: Request, res: Response) {
    try {
      await sizeService.remove(Number(req.params.id));
      return sendSuccess(res, 200, 'Size deleted successfully', null);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
