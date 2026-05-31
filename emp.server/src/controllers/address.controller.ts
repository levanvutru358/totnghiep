import { Request, Response } from 'express';
import { addressService } from '../services/address.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getAddressId = (req: Request) => Number(req.params.addressId);

const requireUserId = (req: Request): number => {
  if (!req.user?.id) throw new Error('UNAUTHORIZED');
  return req.user.id;
};

const getBody = (req: Request): Record<string, unknown> =>
  typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const code = message.split(':')[0];

  if (code === 'UNAUTHORIZED') {
    return { status: 401, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
  }
  if (code === 'ADDRESS_NOT_FOUND') {
    return { status: 404, message: 'Không tìm thấy địa chỉ', errorCode: code };
  }
  if (code.startsWith('MISSING_')) {
    return {
      status: 400,
      message: 'Vui lòng nhập đầy đủ thông tin địa chỉ',
      errorCode: code,
    };
  }
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const addressController = {
  async list(req: Request, res: Response) {
    try {
      const data = await addressService.list(requireUserId(req));
      return sendSuccess(res, 200, 'Addresses fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await addressService.create(requireUserId(req), getBody(req));
      return sendSuccess(res, 201, 'Address created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const data = await addressService.update(requireUserId(req), getAddressId(req), getBody(req));
      return sendSuccess(res, 200, 'Address updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const data = await addressService.remove(requireUserId(req), getAddressId(req));
      return sendSuccess(res, 200, 'Address deleted successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
