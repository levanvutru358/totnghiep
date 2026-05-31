import { Request, Response } from 'express';
import { cartService } from '../services/cart.service';
import { sendError, sendSuccess } from '../utils/api-response';

const getItemIdParam = (req: Request): number => Number(req.params.itemId);
const getUserIdParam = (req: Request): number => Number(req.params.userId);
const getBody = (req: Request): Record<string, unknown> =>
  typeof req.body === 'object' && req.body !== null ? (req.body as Record<string, unknown>) : {};

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

  if (errorCode === 'CART_ITEM_NOT_FOUND') {
    return { status: 404, message: 'Cart item not found', errorCode: 'CART_ITEM_NOT_FOUND' };
  }

  if (errorCode === 'CART_NOT_FOUND') {
    return { status: 404, message: 'Cart not found', errorCode: 'CART_NOT_FOUND' };
  }

  if (errorCode === 'VARIANT_NOT_FOUND') {
    return { status: 404, message: 'Variant not found', errorCode: 'VARIANT_NOT_FOUND' };
  }

  if (
    errorCode === 'CART_EMPTY' ||
    errorCode === 'INVALID_GUEST_CART' ||
    errorCode === 'INVALID_USER_ID' ||
    errorCode === 'INVALID_VARIANT_ID' ||
    errorCode === 'INVALID_QUANTITY' ||
    errorCode === 'INVALID_NUMBER' ||
    errorCode === 'INVALID_ORDER_ITEM' ||
    errorCode === 'INVALID_ORDER_TOTAL' ||
    errorCode === 'PAYMENT_NOT_REQUIRED' ||
    errorCode === 'ORDER_ALREADY_PAID' ||
    errorCode === 'ORDER_ALREADY_REFUNDED' ||
    errorCode === 'PAYMENT_PROVIDER_UNSUPPORTED' ||
    errorCode === 'PAYMENT_INVALID_AMOUNT' ||
    errorCode === 'PAYMENT_GATEWAY_REFERENCE_MISSING'
  ) {
    return {
      status: 400,
      message: humanizeErrorCode(errorCode),
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

  if (errorCode.startsWith('MISSING_')) {
    return {
      status: 400,
      message: errorCode.replace('MISSING_', 'Missing ').toLowerCase(),
      errorCode,
    };
  }

  if (errorCode === 'FORBIDDEN_PAYMENT_ACTION' || errorCode === 'FORBIDDEN_ORDER_ACTION') {
    return {
      status: 403,
      message: humanizeErrorCode(errorCode),
      errorCode,
    };
  }
  if (errorCode === 'PAYMENT_CHECKOUT_LOCK_TIMEOUT') {
    return {
      status: 409,
      message: 'Another checkout is already being created for this order',
      errorCode: 'PAYMENT_CHECKOUT_LOCK_TIMEOUT',
    };
  }
  if (errorCode === 'PAYMENT_INIT_ROLLBACK_FAILED') {
    return {
      status: 500,
      message: 'Checkout failed and order rollback also failed',
      errorCode: 'PAYMENT_INIT_ROLLBACK_FAILED',
    };
  }

  if (
    errorCode === 'PAYOS_NOT_CONFIGURED' ||
    errorCode === 'ZALOPAY_NOT_CONFIGURED' ||
    errorCode === 'PAYMENT_GATEWAY_NOT_CONFIGURED' ||
    errorCode === 'PAYOS_CREATE_REJECTED' ||
    errorCode === 'PAYOS_TRANSPORT_ERROR' ||
    errorCode === 'PAYOS_INVALID_RESPONSE' ||
    errorCode === 'ZALOPAY_CREATE_REJECTED' ||
    errorCode === 'ZALOPAY_TRANSPORT_ERROR' ||
    errorCode === 'ZALOPAY_INVALID_RESPONSE'
  ) {
    return {
      status: 502,
      message:
        (errorCode === 'PAYOS_CREATE_REJECTED' || errorCode === 'PAYOS_TRANSPORT_ERROR') &&
        parsed.detail
          ? `payos create rejected: ${parsed.detail}`
          : humanizeErrorCode(errorCode),
      errorCode,
    };
  }

  return {
    status: 500,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR',
  };
};

export const cartController = {
  async adminList(req: Request, res: Response) {
    try {
      requireUser(req);
      const data = await cartService.listForAdmin(req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Admin cart list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async adminDetail(req: Request, res: Response) {
    try {
      requireUser(req);
      const data = await cartService.detailForAdmin(getUserIdParam(req));
      return sendSuccess(res, 200, 'Admin cart detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.detail(user);
      return sendSuccess(res, 200, 'Cart fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async addItem(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.addItem(getBody(req), user);
      return sendSuccess(res, 201, 'Cart item added successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async updateItem(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.updateItem(getItemIdParam(req), getBody(req), user);
      return sendSuccess(res, 200, 'Cart item updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async removeItem(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.removeItem(getItemIdParam(req), user);
      return sendSuccess(res, 200, 'Cart item removed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async selectAll(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.selectAll(getBody(req), user);
      return sendSuccess(res, 200, 'Cart selection updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async selectItems(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.selectItems(getBody(req), user);
      return sendSuccess(res, 200, 'Cart item selection updated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async clear(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.clear(
        {
          ...req.query,
          ...getBody(req),
        },
        user,
      );
      return sendSuccess(res, 200, 'Cart cleared successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async validate(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.validate(getBody(req), user);
      return sendSuccess(res, 200, 'Cart validated successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async merge(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.merge(getBody(req), user);
      return sendSuccess(res, 200, 'Guest cart merged successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async previewCheckout(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.previewCheckout(getBody(req), user);
      return sendSuccess(res, 200, 'Checkout preview created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async checkout(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await cartService.checkoutFromCart(getBody(req), user);
      return sendSuccess(res, 201, 'Cart checkout completed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
