import { Request, Response } from 'express';
import { adminCustomerService } from '../services/admin-customer.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const map: Record<string, { status: number; message: string }> = {
    CUSTOMER_NOT_FOUND: { status: 404, message: 'Không tìm thấy khách hàng' },
    INVALID_FULL_NAME: { status: 400, message: 'Họ tên không hợp lệ' },
    INVALID_STATUS: { status: 400, message: 'Trạng thái không hợp lệ' },
    NO_UPDATABLE_FIELDS: { status: 400, message: 'Không có dữ liệu cập nhật' },
    INVALID_LOCK_REASON: { status: 400, message: 'Lý do khóa tối thiểu 3 ký tự' },
    INVALID_LOCK_DURATION: { status: 400, message: 'Thời gian tạm khóa không hợp lệ' },
  };
  if (map[message]) return { ...map[message], errorCode: message };
  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

const handle = async (res: Response, fn: () => Promise<unknown>, code = 200, msg = 'OK') => {
  try {
    return sendSuccess(res, code, msg, await fn());
  } catch (error) {
    const mapped = mapError(error);
    return sendError(res, mapped.status, mapped.message, mapped.errorCode);
  }
};

export const adminCustomerController = {
  list: (req: Request, res: Response) => handle(res, () => adminCustomerService.list(req.query as Record<string, unknown>)),

  detail: (req: Request, res: Response) =>
    handle(res, () => adminCustomerService.detail(Number(req.params.customerId))),

  update: (req: Request, res: Response) =>
    handle(res, () => adminCustomerService.update(Number(req.params.customerId), req.body), 200, 'Customer updated'),

  lock: (req: Request, res: Response) =>
    handle(
      res,
      () => adminCustomerService.lock(Number(req.params.customerId), req.user!.id, req.body),
      200,
      'Account locked',
    ),

  tempLock: (req: Request, res: Response) =>
    handle(
      res,
      () => adminCustomerService.tempLock(Number(req.params.customerId), req.user!.id, req.body),
      200,
      'Account temporarily locked',
    ),

  unlock: (req: Request, res: Response) =>
    handle(res, () => adminCustomerService.unlock(Number(req.params.customerId)), 200, 'Account unlocked'),
};
