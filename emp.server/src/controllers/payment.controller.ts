import { Request, Response } from 'express';
import { buildZaloPayReturnRedirectUrl } from '../services/payment-zalopay.handler';
import { paymentService } from '../services/payment.service';
import { sendError, sendSuccess } from '../utils/api-response';

const humanizeErrorCode = (value: string): string => value.replace(/_/g, ' ').toLowerCase();

const splitError = (value: string): { code: string; detail?: string } => {
  const separatorIndex = value.indexOf(':');
  if (separatorIndex === -1) return { code: value };
  return {
    code: value.slice(0, separatorIndex),
    detail: value.slice(separatorIndex + 1).trim() || undefined,
  };
};

const getOrderParam = (req: Request): string => {
  const value = req.params.idOrCode;
  return Array.isArray(value) ? value[0] : value;
};

const getPaymentCodeParam = (req: Request): string => {
  const value = req.params.paymentCode;
  return Array.isArray(value) ? value[0] : value;
};

const wantsHtmlReturn = (req: Request): boolean => {
  const format = Array.isArray(req.query.format) ? req.query.format[0] : req.query.format;
  if (typeof format === 'string' && format.trim().toLowerCase() === 'json') {
    return false;
  }

  const redirect = Array.isArray(req.query.redirect) ? req.query.redirect[0] : req.query.redirect;
  if (typeof redirect === 'string' && ['1', 'true', 'yes'].includes(redirect.trim().toLowerCase())) {
    return true;
  }

  const accept = String(req.headers.accept ?? '').toLowerCase();
  return accept.includes('text/html');
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
  if (errorCode === 'PAYMENT_NOT_FOUND') {
    return { status: 404, message: 'Payment not found', errorCode: 'PAYMENT_NOT_FOUND' };
  }
  if (
    errorCode === 'PAYMENT_NOT_REQUIRED' ||
    errorCode === 'ORDER_ALREADY_PAID' ||
    errorCode === 'ORDER_ALREADY_REFUNDED' ||
    errorCode === 'PAYMENT_ALREADY_SUCCEEDED' ||
    errorCode === 'PAYMENT_ALREADY_REFUNDED' ||
    errorCode === 'PAYMENT_EXPIRED' ||
    errorCode === 'PAYMENT_FINALIZED' ||
    errorCode === 'PAYMENT_CANNOT_FAIL' ||
    errorCode === 'PAYMENT_CANNOT_CANCEL' ||
    errorCode === 'PAYMENT_CANNOT_REFUND' ||
    errorCode === 'PAYMENT_PROVIDER_MANAGED' ||
    errorCode === 'PAYMENT_PROVIDER_UNSUPPORTED' ||
    errorCode === 'PAYMENT_METHOD_UNSUPPORTED' ||
    errorCode === 'PAYMENT_GATEWAY_REFERENCE_MISSING' ||
    errorCode === 'PAYMENT_INVALID_AMOUNT' ||
    errorCode === 'PAYOS_RETURN_INVALID_QUERY' ||
    errorCode === 'ZALOPAY_RETURN_INVALID_QUERY'
  ) {
    return {
      status: 400,
      message: humanizeErrorCode(errorCode),
      errorCode,
    };
  }
  if (errorCode === 'FORBIDDEN_PAYMENT_ACTION') {
    return {
      status: 403,
      message: 'Forbidden payment action',
      errorCode: 'FORBIDDEN_PAYMENT_ACTION',
    };
  }
  if (errorCode === 'PAYMENT_CHECKOUT_LOCK_TIMEOUT') {
    return {
      status: 409,
      message: 'Another checkout is already being created for this order',
      errorCode: 'PAYMENT_CHECKOUT_LOCK_TIMEOUT',
    };
  }
  if (errorCode === 'PAYOS_NOT_CONFIGURED') {
    return {
      status: 500,
      message: 'PayOS is not configured',
      errorCode: 'PAYOS_NOT_CONFIGURED',
    };
  }
  if (errorCode === 'ZALOPAY_NOT_CONFIGURED') {
    return {
      status: 500,
      message: 'ZaloPay chưa được cấu hình',
      errorCode: 'ZALOPAY_NOT_CONFIGURED',
    };
  }
  if (errorCode === 'PAYMENT_GATEWAY_NOT_CONFIGURED') {
    return {
      status: 500,
      message: 'Chưa cấu hình cổng thanh toán (ZaloPay hoặc PayOS)',
      errorCode: 'PAYMENT_GATEWAY_NOT_CONFIGURED',
    };
  }
  if (
    errorCode === 'PAYOS_CREATE_REJECTED' ||
    errorCode === 'PAYOS_CANCEL_REJECTED' ||
    errorCode === 'PAYOS_TRANSPORT_ERROR' ||
    errorCode === 'PAYOS_INVALID_RESPONSE' ||
    errorCode === 'ZALOPAY_CREATE_REJECTED' ||
    errorCode === 'ZALOPAY_TRANSPORT_ERROR' ||
    errorCode === 'ZALOPAY_INVALID_RESPONSE'
  ) {
    return {
      status: 502,
      message: parsed.detail ? `Payment gateway error: ${parsed.detail}` : 'Payment gateway error',
      errorCode,
    };
  }

  return {
    status: 500,
    message: 'Internal server error',
    errorCode: 'INTERNAL_SERVER_ERROR',
  };
};

export const paymentController = {
  async payOSCallback(req: Request, res: Response) {
    try {
      const data = await paymentService.handlePayOSCallback(
        req.body as {
          code?: string;
          desc?: string;
          success?: boolean;
          data?: Record<string, unknown>;
          signature?: string;
        },
      );
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({
        error: -1,
        message: 'callback processing failed',
      });
    }
  },

  async zaloPayCallback(req: Request, res: Response) {
    try {
      const body = req.body as { data?: string; mac?: string; type?: number };
      const data = await paymentService.handleZaloPayCallback({
        data: String(body.data ?? ''),
        mac: String(body.mac ?? ''),
        type: body.type,
      });
      return res.status(200).json(data);
    } catch {
      return res.status(200).json({
        return_code: -1,
        return_message: 'callback processing failed',
      });
    }
  },

  async zaloPayReturn(req: Request, res: Response) {
    try {
      const data = await paymentService.handleZaloPayReturn(req.query as Record<string, unknown>);
      if (wantsHtmlReturn(req)) {
        return res.redirect(302, data.redirectUrl);
      }
      return sendSuccess(res, 200, 'ZaloPay return processed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      if (wantsHtmlReturn(req)) {
        const appTransId = Array.isArray(req.query.app_trans_id)
          ? req.query.app_trans_id[0]
          : req.query.app_trans_id;
        return res.redirect(
          302,
          buildZaloPayReturnRedirectUrl({
            appTransId: appTransId ? String(appTransId) : undefined,
            errorCode: mapped.errorCode,
            errorMessage: mapped.message,
          }),
        );
      }
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async payOSReturn(req: Request, res: Response) {
    try {
      const data = await paymentService.handleReturn(req.query as Record<string, unknown>);
      if (wantsHtmlReturn(req)) {
        return res.redirect(302, data.redirectUrl);
      }
      return sendSuccess(res, 200, 'Payment return processed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      if (wantsHtmlReturn(req)) {
        return res.redirect(
          302,
          paymentService.buildReturnRedirectUrl(req.query as Record<string, unknown>, {
            errorCode: mapped.errorCode,
            errorMessage: mapped.message,
          }),
        );
      }
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async resolveReturn(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.resolvePaymentReturn(
        req.query as Record<string, unknown>,
        user,
      );
      return sendSuccess(res, 200, 'Payment return resolved successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async methods(req: Request, res: Response) {
    try {
      requireUser(req);
      const data = await paymentService.methods();
      return sendSuccess(res, 200, 'Payment methods fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async list(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.list(req.query as Record<string, unknown>, user);
      return sendSuccess(res, 200, 'Payment list fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async listByOrder(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.listByOrder(getOrderParam(req), user);
      return sendSuccess(res, 200, 'Order payments fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async detail(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.detail(getPaymentCodeParam(req), user);
      return sendSuccess(res, 200, 'Payment detail fetched successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async createCheckout(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.createCheckout(getOrderParam(req), req.body, user);
      return sendSuccess(res, 201, 'Payment checkout created successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async retryCheckout(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.retryCheckout(getOrderParam(req), req.body, user);
      return sendSuccess(res, 200, 'Payment checkout retried successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async syncStatus(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.syncStatus(getPaymentCodeParam(req), user);
      return sendSuccess(res, 200, 'Payment status synced successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async cancel(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.cancel(getPaymentCodeParam(req), req.body, user);
      return sendSuccess(res, 200, 'Payment cancelled successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async confirm(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.confirm(getPaymentCodeParam(req), req.body, user);
      return sendSuccess(res, 200, 'Payment confirmed successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async fail(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.fail(getPaymentCodeParam(req), req.body, user);
      return sendSuccess(res, 200, 'Payment marked as failed', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async refund(req: Request, res: Response) {
    try {
      const user = requireUser(req);
      const data = await paymentService.refund(getPaymentCodeParam(req), req.body, user);
      return sendSuccess(res, 200, 'Payment refunded successfully', data);
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
