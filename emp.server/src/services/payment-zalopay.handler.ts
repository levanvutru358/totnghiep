import { UserRole } from '../constants/roles';
import type { OrderPaymentMethod } from '../constants/orders';
import { getZaloPayIsConfigured, zaloPayConfig } from '../configs/zalopay.config';
import { catalogToFullVnd } from '../lib/money-vnd';
import {
  paymentRepository,
  type CreatePaymentInput,
} from '../repositories/payment.repository';
import {
  generateZaloPayAppTransId,
  zaloPayService,
  type ZaloPayCallbackPayload,
} from './zalopay.service';

const ZALOPAY_PROVIDER = 'ZALOPAY';

type PaymentActor = {
  id: number;
  email: string;
  role: UserRole;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const toOptionalString = (value: unknown): string | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  if (typeof value === 'boolean') return String(value);
  return normalizeOptionalString(value);
};

const parseMetadata = (value: unknown): Record<string, unknown> => {
  if (typeof value !== 'string' || value.trim().length === 0) return {};
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return {};
  } catch {
    return {};
  }
};

const buildMetadataJson = (existing: unknown, patch: Record<string, unknown>): string =>
  JSON.stringify({
    ...parseMetadata(existing),
    ...patch,
  });

const getErrorMessage = (code: string, detail?: string): string =>
  detail && detail.trim().length > 0 ? `${code}:${detail.trim()}` : code;

const getGatewayAmount = (order: Record<string, unknown>): number => {
  const catalogAmount = Math.round(Number(order.total_amount || 0));
  const amount = catalogToFullVnd(catalogAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('PAYMENT_INVALID_AMOUNT');
  }
  return amount;
};

const buildZaloPayDescription = (order: Record<string, unknown>): string => {
  const code = String(order.order_code ?? order.id ?? 'DTT')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  return `DTT ${code}`.slice(0, 256);
};

const isFinalPaymentStatus = (status: unknown): boolean =>
  ['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(
    normalizeString(status).toUpperCase(),
  );

const isLocallySuccessfulPaymentStatus = (status: unknown): boolean =>
  ['SUCCEEDED', 'REFUNDED'].includes(normalizeString(status).toUpperCase());

export const isZaloPayProvider = (provider: unknown): boolean =>
  normalizeString(provider).toUpperCase() === ZALOPAY_PROVIDER;

export const buildZaloPayReturnRedirectUrl = (input: {
  appTransId?: string;
  payment?: Record<string, unknown> | null;
  errorCode?: string;
  errorMessage?: string;
  cancelled?: boolean;
}): string => {
  const url = new URL(zaloPayConfig.resultUrl);
  url.searchParams.set('provider', ZALOPAY_PROVIDER);
  if (input.appTransId) url.searchParams.set('app_trans_id', input.appTransId);
  if (input.cancelled) url.searchParams.set('cancel', 'true');

  if (input.payment) {
    url.searchParams.set('paymentCode', String(input.payment.payment_code));
    url.searchParams.set('paymentStatus', String(input.payment.status));
    url.searchParams.set('orderId', String(input.payment.order_id));
    url.searchParams.set('orderCodeResolved', String(input.payment.order_code));
    url.searchParams.set('orderPaymentStatus', String(input.payment.order_payment_status));
  }

  if (input.errorCode) url.searchParams.set('errorCode', input.errorCode);
  if (input.errorMessage) url.searchParams.set('message', input.errorMessage);

  return url.toString();
};

export const syncZaloPayPaymentStatus = async (
  payment: Record<string, unknown>,
  actor: PaymentActor | null,
  scope?: { userId?: number },
) => {
  if (!isZaloPayProvider(payment.provider)) throw new Error('PAYMENT_PROVIDER_UNSUPPORTED');
  if (!getZaloPayIsConfigured()) throw new Error('ZALOPAY_NOT_CONFIGURED');

  const paymentCode = String(payment.payment_code);
  const gatewayReference =
    normalizeOptionalString(payment.gateway_reference) ??
    normalizeOptionalString(parseMetadata(payment.metadata_json).zaloPayAppTransId);

  if (!gatewayReference) throw new Error('PAYMENT_GATEWAY_REFERENCE_MISSING');

  const gateway = await zaloPayService.queryOrder(gatewayReference);
  const metadataJson = buildMetadataJson(payment.metadata_json, {
    lastQueryResponse: gateway,
    lastSyncedAt: new Date().toISOString(),
  });

  const isPaid =
    gateway.return_code === 1 &&
    (gateway.sub_return_code === 1 || gateway.is_processing === false);

  if (isPaid) {
    if (!isFinalPaymentStatus(payment.status)) {
      const updatedPayment = await paymentRepository.markSucceeded({
        paymentCode,
        gatewayTransactionId:
          toOptionalString(gateway.zp_trans_id) ??
          toOptionalString(payment.gateway_transaction_id) ??
          null,
        gatewayReference,
        metadataJson,
        note: 'Payment confirmed by ZaloPay query',
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
      });
      return { payment: updatedPayment, gateway };
    }

    const detail =
      (await paymentRepository.updateMetadata(paymentCode, metadataJson)) ??
      (await paymentRepository.getDetailByCode(paymentCode, scope));

    return {
      payment: detail,
      gateway,
      ...(isLocallySuccessfulPaymentStatus(payment.status)
        ? {}
        : { warning: 'PAYMENT_FINALIZED_LOCALLY' }),
    };
  }

  const detail =
    (await paymentRepository.updateMetadata(paymentCode, metadataJson)) ??
    (await paymentRepository.getDetailByCode(paymentCode, scope));

  return { payment: detail, gateway };
};

export const createZaloPayCheckout = async (input: {
  lockedOrder: Record<string, unknown>;
  paymentCode: string;
  paymentMethod: OrderPaymentMethod;
  body: Record<string, unknown>;
  actor: PaymentActor;
}) => {
  const { lockedOrder, paymentCode, paymentMethod, body, actor } = input;
  const appTransId = generateZaloPayAppTransId(Number(lockedOrder.id));
  const amount = getGatewayAmount(lockedOrder);
  const description = buildZaloPayDescription(lockedOrder);
  const gatewayReturnUrl = `${zaloPayConfig.returnUrl}?app_trans_id=${encodeURIComponent(appTransId)}`;
  const returnUrl = gatewayReturnUrl;
  const resultUrl = gatewayReturnUrl;
  const cancelUrl = normalizeOptionalString(body.cancelUrl) ?? zaloPayConfig.cancelUrl;
  const appUser = String(lockedOrder.user_id ?? actor.id);
  const expiredAt = new Date(Date.now() + zaloPayConfig.expireDurationSeconds * 1000);

  const embedData = {
    redirecturl: returnUrl,
    resulturl: resultUrl,
    cancelurl: cancelUrl,
    paymentCode,
    orderCode: String(lockedOrder.order_code ?? lockedOrder.id),
  };

  const items = Array.isArray(lockedOrder.items)
    ? (lockedOrder.items as Array<Record<string, unknown>>).map((item, index) => ({
        id: String(item.sku ?? item.id ?? `item-${index + 1}`).slice(0, 64),
        amount: Math.max(
          0,
          catalogToFullVnd(
            Math.round(
              Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
            ),
          ),
        ),
      }))
    : [{ id: paymentCode, amount }];

  const gatewayResponse = await zaloPayService.createOrder({
    appTransId,
    amount,
    appUser,
    description,
    embedData,
    items,
  });

  if (gatewayResponse.return_code !== 1 || !normalizeOptionalString(gatewayResponse.order_url)) {
    throw new Error(
      getErrorMessage(
        'ZALOPAY_CREATE_REJECTED',
        [gatewayResponse.return_code, gatewayResponse.return_message, gatewayResponse.sub_return_message]
          .filter(Boolean)
          .join(' - '),
      ),
    );
  }

  const checkoutUrl = normalizeOptionalString(gatewayResponse.order_url)!;
  const metadataJson = JSON.stringify({
    provider: ZALOPAY_PROVIDER,
    zaloPayAppTransId: appTransId,
    description,
    items,
    createResponse: gatewayResponse,
    webhookUrl: zaloPayConfig.webhookUrl,
    returnUrl,
    resultUrl,
    cancelUrl,
    expiredAt: expiredAt.toISOString(),
  });

  const createInput: CreatePaymentInput = {
    paymentCode,
    orderId: Number(lockedOrder.id),
    userId: Number(lockedOrder.user_id),
    paymentMethod,
    provider: ZALOPAY_PROVIDER,
    initialStatus: 'PENDING',
    amount,
    currencyCode: String(lockedOrder.currency_code || 'VND'),
    checkoutUrl,
    qrContent: null,
    deepLink: normalizeOptionalString(gatewayResponse.zp_trans_token),
    gatewayTransactionId: normalizeOptionalString(gatewayResponse.zp_trans_token),
    gatewayReference: appTransId,
    metadataJson,
    expiresAt: expiredAt,
    note: 'ZaloPay checkout created',
    actorUserId: actor.id,
  };

  return paymentRepository.createCheckout(createInput);
};

export const handleZaloPayCallback = async (body: ZaloPayCallbackPayload) => {
  if (!getZaloPayIsConfigured()) {
    return { return_code: 1, return_message: 'zalopay not configured' };
  }

  if (!zaloPayService.verifyCallback(body)) {
    return { return_code: -1, return_message: 'mac invalid' };
  }

  const callbackData = zaloPayService.parseCallbackData(body);
  const gatewayReference = normalizeOptionalString(callbackData.app_trans_id);

  if (!gatewayReference) {
    return { return_code: 1, return_message: 'app_trans_id missing' };
  }

  const payment = await paymentRepository.getByGatewayReference(gatewayReference, ZALOPAY_PROVIDER);
  if (!payment) {
    return { return_code: 1, return_message: 'payment not found' };
  }

  const metadataJson = buildMetadataJson(payment.metadata_json, {
    lastCallbackBody: body,
    lastCallbackData: callbackData,
    lastCallbackAt: new Date().toISOString(),
  });

  if (isFinalPaymentStatus(payment.status)) {
    await paymentRepository.updateMetadata(String(payment.payment_code), metadataJson);
    return { return_code: 1, return_message: 'success' };
  }

  if (Number(callbackData.status) !== 1) {
    await paymentRepository.updateMetadata(String(payment.payment_code), metadataJson);
    return { return_code: 1, return_message: 'ignored' };
  }

  await paymentRepository.markSucceeded({
    paymentCode: String(payment.payment_code),
    gatewayTransactionId:
      toOptionalString(callbackData.zp_trans_id) ??
      toOptionalString(payment.gateway_transaction_id) ??
      null,
    gatewayReference,
    metadataJson,
    note: 'Payment confirmed by ZaloPay callback',
    actorUserId: null,
    actorRole: null,
  });

  return { return_code: 1, return_message: 'success' };
};

export const handleZaloPayReturn = async (query: Record<string, unknown>) => {
  const appTransId = normalizeOptionalString(query.app_trans_id);
  if (!appTransId) throw new Error('ZALOPAY_RETURN_INVALID_QUERY');

  const payment = await paymentRepository.getByGatewayReference(appTransId, ZALOPAY_PROVIDER);
  if (!payment) throw new Error('PAYMENT_NOT_FOUND');

  const synced = await syncZaloPayPaymentStatus(payment, null);
  const cancelled = normalizeString(query.cancel).toLowerCase() === 'true';

  return {
    provider: ZALOPAY_PROVIDER,
    query: { app_trans_id: appTransId, cancel: cancelled },
    payment: synced.payment,
    gateway: synced.gateway,
    redirectUrl: buildZaloPayReturnRedirectUrl({
      appTransId,
      payment: synced.payment as Record<string, unknown>,
      cancelled,
    }),
  };
};
