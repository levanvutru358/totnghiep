import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (message === 'VARIANT_NOT_FOUND')
    return { status: 404, message: 'Variant not found', errorCode: 'VARIANT_NOT_FOUND' };
  if (message === 'INSUFFICIENT_STOCK')
    return { status: 400, message: 'Insufficient stock', errorCode: 'INSUFFICIENT_STOCK' };
  if (message === 'INVALID_TRANSACTION_TYPE')
    return { status: 400, message: 'transactionType must be IN, OUT or ADJUSTMENT', errorCode: 'INVALID_TRANSACTION_TYPE' };
  if (message === 'INVALID_QUANTITY')
    return {
      status: 400,
      message: 'quantity invalid (IN/OUT: positive integer; ADJUSTMENT: integer ≥ 0)',
      errorCode: 'INVALID_QUANTITY',
    };
  if (message === 'TRANSACTION_NOT_FOUND')
    return { status: 404, message: 'Transaction not found', errorCode: 'TRANSACTION_NOT_FOUND' };
  if (message === 'INVALID_INVENTORY_VARIANT_ID')
    return {
      status: 400,
      message: 'variantId must be a positive integer',
      errorCode: 'INVALID_INVENTORY_VARIANT_ID',
    };
  if (message.startsWith('MISSING_'))
    return { status: 400, message: message.replace('MISSING_', 'Missing '), errorCode: message };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const inventoryController = {
  async list(req: Request, res: Response) {
    try {
      const data = await inventoryService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Inventory history fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
  async create(req: Request, res: Response) {
    try {
      const data = await inventoryService.create(req.body);
      return sendSuccess(res, 201, 'Inventory transaction created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return sendError(res, 400, 'id must be a positive integer', 'INVALID_TRANSACTION_ID');
      }
      const data = await inventoryService.update(id, req.body);
      return sendSuccess(res, 200, 'Inventory transaction updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id < 1) {
        return sendError(res, 400, 'id must be a positive integer', 'INVALID_TRANSACTION_ID');
      }
      const data = await inventoryService.remove(id);
      return sendSuccess(res, 200, 'Inventory transaction deleted successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
