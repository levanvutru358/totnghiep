import { Request, Response } from 'express';
import { UserRole } from '../constants/roles';
import { cartService } from '../services/cart.service';
import { orderService } from '../services/order.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getIdentifierParam = (req: Request): string => {
  const value = req.params.idOrCode ?? req.params.orderId;
  return Array.isArray(value) ? value[0] : value;
};
const getReturnIdParam = (req: Request): number => Number(req.params.returnId);

const humanizeErrorCode = (value: string): string => value.replace(/_/g, ' ').toLowerCase();

const splitError = (value: string): { code: string; detail?: string } => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex === -1) return { code: value };

  return {
    code: value.slice(0, separatorIndex),
    detail: value.slice(separatorIndex + 1).trim() || undefined,
  };
};

const requireUser = (req: Request) => {
  if (!req.user) throw new Error('UNAUTHORIZED');
  return req.user;
};

const mapError = (
  error: unknown,
): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const parsed = splitError(message);
  const errorCode = parsed.code;

  if (errorCode === 'UNAUTHORIZED') {
    return { status: 401, message: 'Unauthorized', errorCode: 'UNAUTHORIZED' };
  }
  if (errorCode === 'ORDER_NOT_FOUND') {
    return { status: 404, message: 'Order not found', errorCode: 'ORDER_NOT_FOUND' };
  }
  if (errorCode === 'VARIANT_NOT_FOUND') {
    return { status: 404, message: 'Variant not found', errorCode: 'VARIANT_NOT_FOUND' };
  }
  if (errorCode === 'RETURN_REQUEST_NOT_FOUND') {
    return { status: 404, message: 'Return request not found', errorCode };
  }
  if (
    errorCode === 'INVALID_ORDER_STATUS' ||
    errorCode === 'INVALID_ORDER_TRANSITION' ||
    errorCode === 'INVALID_ORDER_ITEM' ||
    errorCode === 'INVALID_VARIANT_ID' ||
    errorCode === 'INVALID_QUANTITY' ||
    errorCode === 'INVALID_NUMBER' ||
    errorCode === 'INVALID_ORDER_TOTAL' ||
    errorCode === 'INVALID_RETURN_ID' ||
    errorCode === 'MISSING_SHIPPING_TRACKING' ||
    errorCode === 'PAYMENT_REQUIRED_BEFORE_CONFIRMATION' ||
    errorCode === 'ORDER_ALREADY_PAID' ||
    errorCode === 'ORDER_ALREADY_REFUNDED' ||
    errorCode === 'ORDER_NOT_REFUNDABLE' ||
    errorCode === 'ORDER_PAYMENT_MANAGED_BY_PAYMENT_API' ||
    errorCode === 'REORDER_ITEM_UNAVAILABLE'
  ) {
    return {
      status: 400,
      message:
        errorCode === 'REORDER_ITEM_UNAVAILABLE' && parsed.detail
          ? `reorder item unavailable: ${parsed.detail}`
          : humanizeErrorCode(errorCode),
      errorCode,
    };
  }
  if (errorCode === 'INSUFFICIENT_STOCK') {
    return { status: 400, message: 'Insufficient stock', errorCode: 'INSUFFICIENT_STOCK' };
  }
  if (
    errorCode === 'PROMOTION_NOT_FOUND' ||
    errorCode === 'PROMOTION_INACTIVE' ||
    errorCode === 'PROMOTION_EXPIRED' ||
    errorCode === 'PROMOTION_NOT_STARTED' ||
    errorCode === 'PROMOTION_MIN_ORDER_NOT_MET' ||
    errorCode === 'PROMOTION_USAGE_LIMIT_REACHED' ||
    errorCode === 'PROMOTION_USER_LIMIT_REACHED'
  ) {
    return { status: 400, message: humanizeErrorCode(errorCode), errorCode };
  }
  if (errorCode === 'FORBIDDEN_ORDER_ACTION') {
    return { status: 403, message: 'Forbidden order action', errorCode: 'FORBIDDEN_ORDER_ACTION' };
  }
  if (errorCode === 'ORDER_CREATE_VIA_CHECKOUT_ONLY') {
    return {
      status: 403,
      message: 'Use cart checkout to create order',
      errorCode: 'ORDER_CREATE_VIA_CHECKOUT_ONLY',
    };
  }
  if (errorCode.startsWith('MISSING_')) {
    return {
      status: 400,
      message: errorCode.replace('MISSING_', 'Missing ').toLowerCase(),
      errorCode,
    };
  }

  return {
    status: 500,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR',
  };
};

export const orderController = {
  async list(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.list(req.query as Record<string, unknown>, user);
      return sendSuccess(res, 200, 'Order list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listMine(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.listMine(req.query as Record<string, unknown>, user);
      return sendSuccess(res, 200, 'My orders fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.detail(getIdentifierParam(req), user);
      return sendSuccess(res, 200, 'Order detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async status(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.status(getIdentifierParam(req), user);
      return sendSuccess(res, 200, 'Order status fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async timeline(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.timeline(getIdentifierParam(req), user);
      return sendSuccess(res, 200, 'Order timeline fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async invoice(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.invoice(getIdentifierParam(req), user);
      return sendSuccess(res, 200, 'Order invoice fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async reorder(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.reorderFromOrder(getIdentifierParam(req), user);
      return sendSuccess(res, 200, 'Order items added back to cart successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async create(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      if (user.role === UserRole.CUSTOMER) {
        const source =
          typeof req.body?.source === 'string' ? req.body.source.trim().toUpperCase() : '';
        if (source !== 'BUY_NOW') {
          throw new Error('ORDER_CREATE_VIA_CHECKOUT_ONLY');
        }
      }
      const data = await orderService.create(req.body, user);
      return sendSuccess(res, 201, 'Order created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      if (mapped.status >= 500) {
        // eslint-disable-next-line no-console
        console.error('orderController.create failed', error);
      }
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async updateStatus(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.updateStatus(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Order status updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.cancel(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Order cancelled successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async complete(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.complete(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Order completed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async refund(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.refund(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Order refunded successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async requestReturn(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.requestReturn(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Return requested successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async approveReturn(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.approveReturn(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Return approved successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async confirm(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.updateStatus(
        getIdentifierParam(req),
        {
          ...req.body,
          status: 'CONFIRMED',
        },
        user,
      );
      return sendSuccess(res, 200, 'Order confirmed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async rejectReturn(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await orderService.rejectReturn(getIdentifierParam(req), req.body, user);
      return sendSuccess(res, 200, 'Return rejected successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async export(req: Request, res: Response) {
    try {
      requireUser(req);
      const csv = await orderService.exportList(req.query as Record<string, unknown>);
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="orders-export-${timestamp}.csv"`,
      );

      return res.status(200).send(csv);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listReturns(req: Request, res: Response) {
    try {
      requireUser(req);
      const data = await orderService.listReturnRequests(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Return request list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detailReturn(req: Request, res: Response) {
    try {
      requireUser(req);
      const data = await orderService.detailReturnRequest(getReturnIdParam(req));
      return sendSuccess(res, 200, 'Return request detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
