import { Request, Response } from 'express';
import { shopSettingsService } from '../services/shop-settings.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getBody = (req: Request): Record<string, unknown> =>
  typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

const mapError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const errorCode = message.split(':')[0];

  if (errorCode === 'MISSING_SHOP_NAME') {
    return { status: 400, message: 'Tên shop là bắt buộc', errorCode };
  }
  if (errorCode === 'MISSING_LOGO_URL') {
    return { status: 400, message: 'Logo là bắt buộc', errorCode };
  }
  if (errorCode === 'PAYMENT_GATEWAY_REQUIRED') {
    return {
      status: 400,
      message: 'Phải bật ít nhất một cổng thanh toán (PayOS hoặc ZaloPay)',
      errorCode,
    };
  }

  return { status: 500, message: 'Không thể xử lý cài đặt shop', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const shopSettingsController = {
  async getPublic(_req: Request, res: Response) {
    try {
      const data = await shopSettingsService.getPublic();
      return sendSuccess(res, 200, 'Shop settings fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async getAdmin(_req: Request, res: Response) {
    try {
      const data = await shopSettingsService.getAdmin();
      return sendSuccess(res, 200, 'Shop settings fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const data = await shopSettingsService.update(getBody(req));
      return sendSuccess(res, 200, 'Shop settings updated', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
