import { Request, Response } from 'express';
import { promotionService } from '../services/promotion.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getBody = (req: Request): Record<string, unknown> =>
  typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

const getIdParam = (req: Request): number => Number(req.params.promotionId);

const humanizeErrorCode = (value: string): string => value.replace(/_/g, ' ').toLowerCase();

const requireUser = (req: Request) => {
  if (!req.user) throw new Error('UNAUTHORIZED');
  return req.user;
};

const mapError = (
  error: unknown,
): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const errorCode = message.split(':')[0];

  if (errorCode === 'UNAUTHORIZED') {
    return { status: 401, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
  }
  if (errorCode === 'PROMOTION_NOT_FOUND') {
    return { status: 404, message: 'Mã khuyến mãi không tồn tại', errorCode };
  }
  if (errorCode === 'PROMOTION_CODE_EXISTS') {
    return { status: 409, message: 'Mã khuyến mãi đã tồn tại', errorCode };
  }
  if (errorCode === 'PROMOTION_MIN_ORDER_NOT_MET') {
    return {
      status: 400,
      message: 'Đơn chưa đủ giá trị tối thiểu để dùng mã khuyến mãi',
      errorCode,
    };
  }
  if (
    errorCode === 'PROMOTION_INACTIVE' ||
    errorCode === 'PROMOTION_EXPIRED' ||
    errorCode === 'PROMOTION_NOT_STARTED' ||
    errorCode === 'PROMOTION_USAGE_LIMIT_REACHED' ||
    errorCode === 'PROMOTION_USER_LIMIT_REACHED' ||
    errorCode === 'INVALID_DISCOUNT_TYPE' ||
    errorCode === 'INVALID_ORDER_TOTAL' ||
    errorCode === 'MISSING_CODE'
  ) {
    return { status: 400, message: humanizeErrorCode(errorCode), errorCode };
  }
  if (errorCode.startsWith('MISSING_')) {
    return {
      status: 400,
      message: errorCode.replace('MISSING_', 'Missing ').toLowerCase(),
      errorCode,
    };
  }

  return { status: 500, message: 'Internal server error', errorCode: 'INTERNAL_SERVER_ERROR' };
};

export const promotionController = {
  async listAvailable(_req: Request, res: Response) {
    try {
      const data = await promotionService.listAvailableForShop();
      return sendSuccess(res, 200, 'Available promotions fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listAvailableForMe(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await promotionService.listAvailableForUser(user.id);
      return sendSuccess(res, 200, 'Available promotions fetched', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async list(req: Request, res: Response) {
    try {
      const data = await promotionService.list(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Promotions fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const data = await promotionService.detail(getIdParam(req));
      return sendSuccess(res, 200, 'Promotion fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const data = await promotionService.create(getBody(req));
      return sendSuccess(res, 201, 'Promotion created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async update(req: Request, res: Response) {
    try {
      const data = await promotionService.update(getIdParam(req), getBody(req));
      return sendSuccess(res, 200, 'Promotion updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async remove(req: Request, res: Response) {
    try {
      const data = await promotionService.remove(getIdParam(req));
      return sendSuccess(res, 200, 'Promotion deleted successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async validate(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await promotionService.validateForCheckout(getBody(req), user.id);
      return sendSuccess(res, 200, 'Promotion applied successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
