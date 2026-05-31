import { payOSConfig } from '../configs/payos.config';
import { getZaloPayIsConfigured, zaloPayConfig } from '../configs/zalopay.config';
import {
  ENABLED_ORDER_PAYMENT_METHODS,
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from '../constants/orders';
import {
  isPaymentTransactionStatus,
  type PaymentTransactionStatus,
} from '../constants/payments';
import { UserRole } from '../constants/roles';
import { orderRepository } from '../repositories/order.repository';
import {
  paymentRepository,
  type CreatePaymentInput,
  type PaymentListFilters,
} from '../repositories/payment.repository';
import {
  payOSService,
  type PayOSPaymentLinkData,
  type PayOSWebhookBody,
} from './payos.service';
import {
  createZaloPayCheckout,
  handleZaloPayCallback as processZaloPayCallback,
  handleZaloPayReturn as processZaloPayReturn,
  isZaloPayProvider,
  syncZaloPayPaymentStatus,
} from './payment-zalopay.handler';
import { catalogToFullVnd } from '../lib/money-vnd';
import { shopSettingsService } from './shop-settings.service';

interface PaymentActor {
  id: number;
  email: string;
  role: UserRole;
}

const PAYOS_PROVIDER = 'PAYOS';
const ZALOPAY_PROVIDER = 'ZALOPAY';

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const isTruthyValue = (value: unknown): boolean => {
  const normalized = normalizeString(value).toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
};

const getErrorMessage = (code: string, detail?: string): string =>
  detail && detail.trim().length > 0 ? `${code}:${detail.trim()}` : code;

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

const buildMetadataJson = (
  existing: unknown,
  patch: Record<string, unknown>,
): string =>
  JSON.stringify({
    ...parseMetadata(existing),
    ...patch,
  });

const isPayOSProvider = (provider: unknown): boolean =>
  normalizeString(provider).toUpperCase() === PAYOS_PROVIDER;

const isFinalPaymentStatus = (status: unknown): boolean =>
  ['SUCCEEDED', 'FAILED', 'CANCELLED', 'EXPIRED', 'REFUNDED'].includes(
    normalizeString(status).toUpperCase(),
  );

const isLocallySuccessfulPaymentStatus = (status: unknown): boolean =>
  ['SUCCEEDED', 'REFUNDED'].includes(normalizeString(status).toUpperCase());

const generatePaymentCode = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0',
  )}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomPart = Math.random().toString().slice(2, 8);
  return `PAY-${datePart}-${timePart}-${randomPart}`;
};

const generateGatewayTransactionId = (): string => {
  const randomPart = Math.random().toString().slice(2, 12);
  return `GTW-${randomPart}`;
};

const generatePayOSOrderCode = (orderId: number): number =>
  Number(`${Date.now()}${String(orderId % 1000).padStart(3, '0')}`);

const getScopedFilter = (actor: PaymentActor) =>
  actor.role === UserRole.CUSTOMER ? { userId: actor.id } : undefined;

const resolveCheckoutProvider = (body: Record<string, unknown>): string => {
  const requested = normalizeString(body.provider).toUpperCase();
  if (requested === 'ZALOPAY' && getZaloPayIsConfigured()) return 'ZALOPAY';
  if (requested === 'PAYOS' && payOSConfig.isConfigured) return 'PAYOS';
  if (getZaloPayIsConfigured()) return 'ZALOPAY';
  if (payOSConfig.isConfigured) return 'PAYOS';
  throw new Error('PAYMENT_GATEWAY_NOT_CONFIGURED');
};

const resolveDefaultProvider = (paymentMethod: OrderPaymentMethod): string => {
  if (paymentMethod === 'COD') return 'COD';
  return resolveCheckoutProvider({});
};

const getDefaultPreferredPaymentMethods = (): string[] => [];

const getGatewayAmount = (order: any): number => {
  const catalogAmount = Math.round(Number(order.total_amount || 0));
  const amount = catalogToFullVnd(catalogAmount);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('PAYMENT_INVALID_AMOUNT');
  }
  return amount;
};

const getGatewayReference = (payment: any): string | undefined => {
  const directReference = toOptionalString(payment.gateway_reference);
  if (directReference) return directReference;

  const metadata = parseMetadata(payment.metadata_json);
  const payOSOrderCode = metadata.payOSOrderCode;
  if (typeof payOSOrderCode === 'number' && Number.isFinite(payOSOrderCode)) {
    return String(payOSOrderCode);
  }

  return typeof payOSOrderCode === 'string' && payOSOrderCode.trim().length > 0
    ? payOSOrderCode.trim()
    : undefined;
};

const buildPayOSItems = (order: any): Array<{
  name: string;
  quantity: number;
  price: number;
  unit: string;
}> =>
  Array.isArray(order.items)
    ? order.items.map((item: any) => ({
        name: String(item.product_name ?? item.sku ?? 'Product').slice(0, 255),
        quantity: Math.max(1, Number(item.quantity || 1)),
        price: Math.max(
          0,
          catalogToFullVnd(Math.round(Number(item.unit_price || 0))),
        ),
        unit: 'pcs',
      }))
    : [];

const buildBuyerAddress = (order: any, body: Record<string, unknown>): string | undefined => {
  const bodyAddress =
    typeof body.shippingAddress === 'object' && body.shippingAddress !== null
      ? (body.shippingAddress as Record<string, unknown>)
      : {};

  const parts = [
    normalizeOptionalString(bodyAddress.line1) ?? normalizeOptionalString(order.shipping_address_line1),
    normalizeOptionalString(bodyAddress.line2) ?? normalizeOptionalString(order.shipping_address_line2),
    normalizeOptionalString(bodyAddress.ward) ?? normalizeOptionalString(order.shipping_ward),
    normalizeOptionalString(bodyAddress.district) ?? normalizeOptionalString(order.shipping_district),
    normalizeOptionalString(bodyAddress.province) ?? normalizeOptionalString(order.shipping_province),
    normalizeOptionalString(bodyAddress.country) ?? normalizeOptionalString(order.shipping_country),
  ].filter((part): part is string => Boolean(part));

  return parts.length > 0 ? parts.join(', ') : undefined;
};

const buildPayOSDescription = (order: any): string => {
  const normalizedOrderCode = String(order.order_code ?? order.id ?? '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase();
  const suffix =
    normalizedOrderCode.slice(-6) || String(order.id ?? 0).padStart(6, '0').slice(-6);
  return `EMP${suffix}`.slice(0, 25);
};

const listPaymentMethods = async () => {
  const settings = await shopSettingsService.getPublic();
  const gateways: Array<{
    code: OrderPaymentMethod;
    label: string;
    supportsCheckout: boolean;
    defaultProvider: string;
    preferredPaymentMethod: string[];
  }> = [];

  if (shopSettingsService.isZalopayAvailable(settings)) {
    gateways.push({
      code: 'E_WALLET',
      label: 'ZaloPay',
      defaultProvider: 'ZALOPAY',
      supportsCheckout: getZaloPayIsConfigured(),
      preferredPaymentMethod: getDefaultPreferredPaymentMethods(),
    });
  }

  if (shopSettingsService.isPayosAvailable(settings)) {
    gateways.push({
      code: 'E_WALLET',
      label: 'PayOS',
      defaultProvider: 'PAYOS',
      supportsCheckout: true,
      preferredPaymentMethod: getDefaultPreferredPaymentMethods(),
    });
  }

  if (gateways.length > 0) {
    const preferred = settings.defaultPaymentProvider;
    return gateways.sort((a, b) => {
      if (a.defaultProvider === preferred && b.defaultProvider !== preferred) return -1;
      if (b.defaultProvider === preferred && a.defaultProvider !== preferred) return 1;
      return 0;
    });
  }

  return ENABLED_ORDER_PAYMENT_METHODS.map((code) => ({
    code,
    label: 'Thanh toán online',
    supportsCheckout: false,
    defaultProvider: resolveDefaultProvider(code),
    preferredPaymentMethod: getDefaultPreferredPaymentMethods(),
  }));
};

const resolveOrderByIdentifier = async (identifier: string, actor: PaymentActor) => {
  const scope = getScopedFilter(actor);
  const direct = await orderRepository.getDetailByIdOrCode(identifier, scope);
  if (direct) return direct;

  const payOsPayment = await paymentRepository.getByGatewayReference(identifier, PAYOS_PROVIDER);
  const zaloPayment =
    payOsPayment ?? (await paymentRepository.getByGatewayReference(identifier, ZALOPAY_PROVIDER));
  const payment = payOsPayment ?? zaloPayment;

  if (!payment) return null;
  if (scope?.userId && Number(payment.user_id) !== scope.userId) {
    return null;
  }

  return orderRepository.getDetailById(Number(payment.order_id), scope);
};

const getOrderForPayment = async (identifier: string, actor: PaymentActor) => {
  const order = await resolveOrderByIdentifier(identifier, actor);
  if (!order) throw new Error('ORDER_NOT_FOUND');
  return order;
};

const getPayOSTerminalStatus = (
  status: unknown,
): Extract<PaymentTransactionStatus, 'FAILED' | 'CANCELLED' | 'EXPIRED'> | undefined => {
  const normalized = normalizeString(status).toUpperCase();
  if (normalized === 'CANCELLED') return 'CANCELLED';
  if (normalized === 'EXPIRED') return 'EXPIRED';
  if (normalized === 'FAILED') return 'FAILED';
  return undefined;
};

const getGatewayFailureMessage = (data: PayOSPaymentLinkData, fallback?: string): string =>
  normalizeOptionalString(data.cancellationReason) ??
  normalizeOptionalString(data.desc) ??
  normalizeOptionalString(fallback) ??
  'Payment failed on PayOS';

interface PayOSReturnQuery {
  code?: string;
  paymentLinkId?: string;
  cancel: boolean;
  status?: string;
  orderCode?: string;
}

const parsePayOSReturnQuery = (query: Record<string, unknown>): PayOSReturnQuery => ({
  code: normalizeOptionalString(query.code),
  paymentLinkId: normalizeOptionalString(query.id),
  cancel: isTruthyValue(query.cancel),
  status: normalizeOptionalString(query.status),
  orderCode: toOptionalString(query.orderCode),
});

const buildPayOSReturnRedirectUrl = (input: {
  query: PayOSReturnQuery;
  payment?: any | null;
  errorCode?: string;
  errorMessage?: string;
}): string => {
  const url = new URL(payOSConfig.resultUrl);

  url.searchParams.set('provider', PAYOS_PROVIDER);

  if (input.query.code) url.searchParams.set('code', input.query.code);
  if (input.query.paymentLinkId) url.searchParams.set('id', input.query.paymentLinkId);
  if (input.query.status) url.searchParams.set('status', input.query.status);
  if (input.query.orderCode) url.searchParams.set('orderCode', input.query.orderCode);
  if (input.query.cancel) url.searchParams.set('cancel', 'true');

  if (input.payment) {
    url.searchParams.set('paymentCode', String(input.payment.payment_code));
    url.searchParams.set('paymentStatus', String(input.payment.status));
    url.searchParams.set('orderId', String(input.payment.order_id));
    url.searchParams.set('orderCodeResolved', String(input.payment.order_code));
    url.searchParams.set('orderStatus', String(input.payment.order_status));
    url.searchParams.set('orderPaymentStatus', String(input.payment.order_payment_status));
  }

  if (input.errorCode) url.searchParams.set('errorCode', input.errorCode);
  if (input.errorMessage) url.searchParams.set('message', input.errorMessage);

  return url.toString();
};

const resolvePayOSReturnPayment = async (query: PayOSReturnQuery) => {
  if (query.orderCode) {
    const payment = await paymentRepository.getByGatewayReference(query.orderCode, PAYOS_PROVIDER);
    if (payment) return payment;
  }

  if (query.paymentLinkId) {
    const payment = await paymentRepository.getByGatewayTransactionId(
      query.paymentLinkId,
      PAYOS_PROVIDER,
    );
    if (payment) return payment;
  }

  throw new Error('PAYMENT_NOT_FOUND');
};

const syncPayOSPaymentStatus = async (payment: any, actor: PaymentActor | null) => {
  if (!isPayOSProvider(payment.provider)) throw new Error('PAYMENT_PROVIDER_UNSUPPORTED');
  if (!payOSConfig.isConfigured) throw new Error('PAYOS_NOT_CONFIGURED');

  const paymentCode = String(payment.payment_code);
  const scope = actor ? getScopedFilter(actor) : undefined;
  const gatewayReference = getGatewayReference(payment);
  if (!gatewayReference) throw new Error('PAYMENT_GATEWAY_REFERENCE_MISSING');

  const gateway = await payOSService.getPaymentLink(gatewayReference);
  if (gateway.code !== '00' || !gateway.data) {
    throw new Error('PAYOS_INVALID_RESPONSE');
  }

  const gatewayData = gateway.data;
  const gatewayStatus = normalizeString(gatewayData.status).toUpperCase();
  const metadataJson = buildMetadataJson(payment.metadata_json, {
    lastQueryResponse: gateway,
    lastSyncedAt: new Date().toISOString(),
  });

  if (gatewayStatus === 'PAID') {
    if (!isFinalPaymentStatus(payment.status)) {
      const updatedPayment = await paymentRepository.markSucceeded({
        paymentCode,
        gatewayTransactionId:
          toOptionalString(gatewayData.id) ??
          toOptionalString(payment.gateway_transaction_id) ??
          null,
        gatewayReference,
        metadataJson,
        note: 'Payment confirmed by PayOS query',
        actorUserId: actor?.id ?? null,
        actorRole: actor?.role ?? null,
      });

      return {
        payment: updatedPayment,
        gateway,
      };
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

  const terminalStatus = getPayOSTerminalStatus(gatewayStatus);
  if (
    terminalStatus &&
    !isFinalPaymentStatus(payment.status) &&
    String(payment.status) !== 'SUCCEEDED'
  ) {
    const updatedPayment = await paymentRepository.markTerminalStatus({
      paymentCode,
      status: terminalStatus,
      failureReason: getGatewayFailureMessage(gatewayData, gateway.desc),
      metadataJson,
      note: `Payment ${terminalStatus.toLowerCase()} according to PayOS query`,
      actorUserId: actor?.id ?? null,
      actorRole: actor?.role ?? null,
    });

    return {
      payment: updatedPayment,
      gateway,
    };
  }

  const detail =
    (await paymentRepository.updateMetadata(paymentCode, metadataJson)) ??
    (await paymentRepository.getDetailByCode(paymentCode, scope));

  return {
    payment: detail,
    gateway,
  };
};

export const paymentService = {
  async methods() {
    return listPaymentMethods();
  },

  async list(query: Record<string, unknown>, actor: PaymentActor) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);

    const filters: PaymentListFilters = {
      search: normalizeOptionalString(query.search),
      status: isPaymentTransactionStatus(query.status) ? query.status : undefined,
      paymentMethod: isOrderPaymentMethod(query.paymentMethod) ? query.paymentMethod : undefined,
      provider: normalizeOptionalString(query.provider),
      orderId: toPositiveNumber(query.orderId),
      userId: toPositiveNumber(query.userId),
      page,
      limit,
    };

    return paymentRepository.list(filters, getScopedFilter(actor));
  },

  async listByOrder(identifier: string, actor: PaymentActor) {
    const order = await getOrderForPayment(identifier, actor);
    return paymentRepository.listByOrder(Number(order.id), getScopedFilter(actor));
  },

  async detail(paymentCode: string, actor: PaymentActor) {
    const payment = await paymentRepository.getDetailByCode(paymentCode, getScopedFilter(actor));
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    return payment;
  },

  async createCheckout(identifier: string, body: Record<string, unknown>, actor: PaymentActor) {
    const order = await getOrderForPayment(identifier, actor);

    return paymentRepository.runWithOrderCheckoutLock(Number(order.id), async () => {
      const lockedOrder = await getOrderForPayment(identifier, actor);

      if (String(lockedOrder.payment_method) === 'COD') throw new Error('PAYMENT_NOT_REQUIRED');
      if (String(lockedOrder.payment_status) === 'PAID') throw new Error('ORDER_ALREADY_PAID');
      if (String(lockedOrder.payment_status) === 'REFUNDED') throw new Error('ORDER_ALREADY_REFUNDED');
      if (String(lockedOrder.status) === 'CANCELLED' || String(lockedOrder.status) === 'REFUNDED') {
        throw new Error('FORBIDDEN_PAYMENT_ACTION');
      }
      if (!getZaloPayIsConfigured() && !payOSConfig.isConfigured) {
        throw new Error('PAYMENT_GATEWAY_NOT_CONFIGURED');
      }
      if (!isOrderPaymentMethod(lockedOrder.payment_method)) {
        throw new Error('PAYMENT_METHOD_UNSUPPORTED');
      }

      const reusable = await paymentRepository.getReusablePendingByOrder(Number(lockedOrder.id));
      if (reusable) {
        return paymentRepository.getDetailByCode(String(reusable.payment_code));
      }

      const paymentMethod = String(lockedOrder.payment_method) as OrderPaymentMethod;
      const provider = resolveCheckoutProvider(body);
      if (isZaloPayProvider(provider)) {
        const paymentCode = generatePaymentCode();
        return createZaloPayCheckout({
          lockedOrder,
          paymentCode,
          paymentMethod,
          body,
          actor,
        });
      }
      if (!isPayOSProvider(provider)) throw new Error('PAYMENT_PROVIDER_UNSUPPORTED');
      if (!payOSConfig.isConfigured) throw new Error('PAYOS_NOT_CONFIGURED');

      const paymentCode = generatePaymentCode();
      const payOSOrderCode = generatePayOSOrderCode(Number(lockedOrder.id));
      const amount = getGatewayAmount(lockedOrder);
      const description = buildPayOSDescription(lockedOrder);
      const returnUrl =
        normalizeOptionalString(body.returnUrl) ??
        normalizeOptionalString(body.redirectUrl) ??
        payOSConfig.returnUrl;
      const cancelUrl = normalizeOptionalString(body.cancelUrl) ?? payOSConfig.cancelUrl;
      const buyerAddress = buildBuyerAddress(lockedOrder, body);
      const buyerName =
        normalizeOptionalString(body.recipientName) ??
        normalizeOptionalString(lockedOrder.recipient_name);
      const buyerEmail =
        normalizeOptionalString(body.recipientEmail) ??
        normalizeOptionalString(lockedOrder.recipient_email);
      const buyerPhone =
        normalizeOptionalString(body.recipientPhone) ??
        normalizeOptionalString(lockedOrder.recipient_phone);
      const items = buildPayOSItems(lockedOrder);
      const expiredAt = Math.floor(Date.now() / 1000) + payOSConfig.expireDurationSeconds;

      const gatewayResponse = await payOSService.createPaymentLink({
        orderCode: payOSOrderCode,
        amount,
        description,
        buyerName,
        buyerEmail,
        buyerPhone,
        buyerAddress,
        items,
        returnUrl,
        cancelUrl,
        expiredAt,
      });

      const paymentLink = gatewayResponse.data;
      if (
        gatewayResponse.code !== '00' ||
        !paymentLink ||
        !normalizeOptionalString(paymentLink.checkoutUrl)
      ) {
        throw new Error(
          getErrorMessage(
            'PAYOS_CREATE_REJECTED',
            [gatewayResponse.code, gatewayResponse.desc].filter(Boolean).join(' - '),
          ),
        );
      }

      const expiresAt = new Date(expiredAt * 1000);
      const paymentLinkId =
        toOptionalString(paymentLink.paymentLinkId) ??
        toOptionalString(paymentLink.id) ??
        null;
      const metadataJson = JSON.stringify({
        provider: PAYOS_PROVIDER,
        payOSOrderCode,
        description,
        items,
        createResponse: gatewayResponse,
        webhookUrl: payOSConfig.webhookUrl,
        returnUrl,
        cancelUrl,
        buyerAddress,
        expiredAt,
      });

      const input: CreatePaymentInput = {
        paymentCode,
        orderId: Number(lockedOrder.id),
        userId: Number(lockedOrder.user_id),
        paymentMethod,
        provider,
        initialStatus: 'PENDING',
        amount,
        currencyCode: String(lockedOrder.currency_code || 'VND'),
        checkoutUrl: normalizeOptionalString(paymentLink.checkoutUrl) ?? null,
        qrContent: normalizeOptionalString(paymentLink.qrCode) ?? null,
        deepLink: null,
        gatewayTransactionId: paymentLinkId,
        gatewayReference: String(payOSOrderCode),
        metadataJson,
        expiresAt,
        note: 'PayOS checkout created',
        actorUserId: actor.id,
      };

      return paymentRepository.createCheckout(input);
    });
  },

  async retryCheckout(identifier: string, body: Record<string, unknown>, actor: PaymentActor) {
    return this.createCheckout(identifier, body, actor);
  },

  async syncStatus(paymentCode: string, actor: PaymentActor) {
    const payment = await paymentRepository.getByCode(paymentCode, getScopedFilter(actor));
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (isZaloPayProvider(payment.provider)) {
      return syncZaloPayPaymentStatus(payment, actor, getScopedFilter(actor));
    }
    return syncPayOSPaymentStatus(payment, actor);
  },

  async cancel(paymentCode: string, body: Record<string, unknown>, actor: PaymentActor) {
    const payment = await paymentRepository.getByCode(paymentCode, getScopedFilter(actor));
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');

    const currentStatus = String(payment.status);
    if (currentStatus === 'SUCCEEDED') throw new Error('PAYMENT_CANNOT_CANCEL');
    if (currentStatus === 'REFUNDED') throw new Error('PAYMENT_ALREADY_REFUNDED');
    if (currentStatus === 'FAILED' || currentStatus === 'CANCELLED' || currentStatus === 'EXPIRED') {
      return paymentRepository.markTerminalStatus({
        paymentCode,
        status: 'CANCELLED',
        failureReason:
          normalizeOptionalString(body.cancelReason) ??
          normalizeOptionalString(body.cancellationReason) ??
          'Khach hang huy don hang',
        metadataJson: buildMetadataJson(payment.metadata_json, {
          cancelRequest: body,
          cancelledLocallyAt: new Date().toISOString(),
        }),
        note: normalizeOptionalString(body.note) ?? 'Order cancelled via payment cancellation',
        actorUserId: actor.id,
        actorRole: actor.role,
      });
    }

    const cancelReason =
      normalizeOptionalString(body.cancelReason) ??
      normalizeOptionalString(body.cancellationReason) ??
      'Khach hang huy don hang';
    let gatewayResponse: Awaited<ReturnType<typeof payOSService.cancelPaymentLink>> | null = null;

    if (isPayOSProvider(payment.provider)) {
      if (!payOSConfig.isConfigured) throw new Error('PAYOS_NOT_CONFIGURED');

      const gatewayReference = getGatewayReference(payment);
      if (!gatewayReference) throw new Error('PAYMENT_GATEWAY_REFERENCE_MISSING');

      gatewayResponse = await payOSService.cancelPaymentLink(gatewayReference, cancelReason);
      if (gatewayResponse.code !== '00') {
        throw new Error(
          getErrorMessage(
            'PAYOS_CANCEL_REJECTED',
            [gatewayResponse.code, gatewayResponse.desc].filter(Boolean).join(' - '),
          ),
        );
      }
    } else if (isZaloPayProvider(payment.provider)) {
      // ZaloPay: hủy cục bộ khi giao dịch còn PENDING (sandbox không hủy qua API).
    }

    const metadataJson = buildMetadataJson(payment.metadata_json, {
      cancelRequest: body,
      cancelResponse: gatewayResponse,
      cancelledAt: new Date().toISOString(),
    });

    return paymentRepository.markTerminalStatus({
      paymentCode,
      status: 'CANCELLED',
      failureReason: cancelReason,
      metadataJson,
      note: normalizeOptionalString(body.note) ?? 'Order cancelled by customer',
      actorUserId: actor.id,
      actorRole: actor.role,
    });
  },

  async handleZaloPayCallback(body: Parameters<typeof processZaloPayCallback>[0]) {
    return processZaloPayCallback(body);
  },

  async handleZaloPayReturn(query: Record<string, unknown>) {
    return processZaloPayReturn(query);
  },

  async resolvePaymentReturn(query: Record<string, unknown>, actor: PaymentActor) {
    const scope = getScopedFilter(actor);
    const paymentCode = normalizeOptionalString(query.paymentCode);
    const orderCodeResolved = normalizeOptionalString(query.orderCodeResolved);
    const appTransId = normalizeOptionalString(query.app_trans_id);
    const gatewayRef =
      appTransId ??
      normalizeOptionalString(query.gatewayReference) ??
      normalizeOptionalString(query.orderCode);
    const provider = normalizeString(query.provider).toUpperCase();

    let payment: Record<string, unknown> | null = null;

    if (paymentCode) {
      payment = (await paymentRepository.getDetailByCode(paymentCode, scope)) as Record<
        string,
        unknown
      > | null;
    }

    if (!payment && orderCodeResolved) {
      const order = await orderRepository.getDetailByIdOrCode(orderCodeResolved, scope);
      if (order) {
        const payments = await paymentRepository.listByOrder(Number(order.id), scope);
        payment = (payments[0] as Record<string, unknown> | undefined) ?? null;
      }
    }

    if (!payment && gatewayRef) {
      if (provider === ZALOPAY_PROVIDER || appTransId) {
        payment = (await paymentRepository.getByGatewayReference(
          gatewayRef,
          ZALOPAY_PROVIDER,
        )) as Record<string, unknown> | null;
      } else {
        payment =
          ((await paymentRepository.getByGatewayReference(gatewayRef, PAYOS_PROVIDER)) as
            | Record<string, unknown>
            | null) ??
          ((await paymentRepository.getByGatewayReference(gatewayRef, ZALOPAY_PROVIDER)) as
            | Record<string, unknown>
            | null);
      }
    }

    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (scope?.userId && Number(payment.user_id) !== scope.userId) {
      throw new Error('FORBIDDEN_PAYMENT_ACTION');
    }

    let syncedPayment = payment;
    if (isZaloPayProvider(payment.provider)) {
      const synced = await syncZaloPayPaymentStatus(payment, actor, scope);
      syncedPayment = synced.payment as Record<string, unknown>;
    } else if (isPayOSProvider(payment.provider)) {
      const synced = await syncPayOSPaymentStatus(payment, actor);
      syncedPayment = synced.payment as Record<string, unknown>;
    }

    const order = await orderRepository.getDetailById(Number(syncedPayment.order_id), scope);
    if (!order) throw new Error('ORDER_NOT_FOUND');

    return {
      order,
      payment: syncedPayment,
    };
  },

  async handleReturn(query: Record<string, unknown>) {
    if (normalizeString(query.provider).toUpperCase() === 'ZALOPAY' || query.app_trans_id) {
      return processZaloPayReturn(query);
    }

    const parsedQuery = parsePayOSReturnQuery(query);
    if (!parsedQuery.orderCode && !parsedQuery.paymentLinkId) {
      throw new Error('PAYOS_RETURN_INVALID_QUERY');
    }

    const payment = await resolvePayOSReturnPayment(parsedQuery);
    const synced = await syncPayOSPaymentStatus(payment, null);

    return {
      provider: PAYOS_PROVIDER,
      query: {
        code: parsedQuery.code ?? null,
        id: parsedQuery.paymentLinkId ?? null,
        cancel: parsedQuery.cancel,
        status: parsedQuery.status ?? null,
        orderCode: parsedQuery.orderCode ?? null,
      },
      payment: synced.payment,
      gateway: synced.gateway,
      redirectUrl: buildPayOSReturnRedirectUrl({
        query: parsedQuery,
        payment: synced.payment,
      }),
    };
  },

  buildReturnRedirectUrl(
    query: Record<string, unknown>,
    input?: { payment?: any | null; errorCode?: string; errorMessage?: string },
  ) {
    return buildPayOSReturnRedirectUrl({
      query: parsePayOSReturnQuery(query),
      payment: input?.payment,
      errorCode: input?.errorCode,
      errorMessage: input?.errorMessage,
    });
  },

  async handlePayOSCallback(body: PayOSWebhookBody) {
    if (!payOSConfig.isConfigured) {
      return {
        error: 0,
        message: 'payos not configured',
      };
    }

    if (!payOSService.verifyWebhook(body)) {
      return {
        error: -1,
        message: 'invalid signature',
      };
    }

    const callbackData = payOSService.parseWebhookData(body);
    const gatewayReference = toOptionalString(callbackData.orderCode);

    if (!gatewayReference) {
      return {
        error: 0,
        message: 'orderCode missing',
      };
    }

    const payment = await paymentRepository.getByGatewayReference(gatewayReference, PAYOS_PROVIDER);
    if (!payment) {
      return {
        error: 0,
        message: 'payment not found',
      };
    }

    const metadataJson = buildMetadataJson(payment.metadata_json, {
      lastCallbackBody: body,
      lastCallbackData: callbackData,
      lastCallbackAt: new Date().toISOString(),
    });

    if (isFinalPaymentStatus(payment.status)) {
      await paymentRepository.updateMetadata(String(payment.payment_code), metadataJson);
      return {
        error: 0,
        message: 'ok',
      };
    }

    if (body.success !== true || normalizeString(callbackData.code) !== '00') {
      await paymentRepository.updateMetadata(String(payment.payment_code), metadataJson);
      return {
        error: 0,
        message: 'ignored',
      };
    }

    await paymentRepository.markSucceeded({
      paymentCode: String(payment.payment_code),
      gatewayTransactionId:
        toOptionalString(callbackData.reference) ??
        toOptionalString(callbackData.paymentLinkId) ??
        toOptionalString(payment.gateway_transaction_id) ??
        null,
      gatewayReference,
      metadataJson,
      note: 'Payment confirmed by PayOS webhook',
      actorUserId: null,
      actorRole: null,
    });

    return {
      error: 0,
      message: 'ok',
    };
  },

  async confirm(paymentCode: string, body: Record<string, unknown>, actor: PaymentActor) {
    const payment = await paymentRepository.getByCode(paymentCode);
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (isPayOSProvider(payment.provider) || isZaloPayProvider(payment.provider)) {
      throw new Error('PAYMENT_PROVIDER_MANAGED');
    }

    if (String(payment.status) === 'SUCCEEDED') throw new Error('PAYMENT_ALREADY_SUCCEEDED');
    if (String(payment.status) === 'REFUNDED') throw new Error('PAYMENT_ALREADY_REFUNDED');
    if (
      String(payment.status) === 'FAILED' ||
      String(payment.status) === 'CANCELLED' ||
      String(payment.status) === 'EXPIRED'
    ) {
      throw new Error('PAYMENT_FINALIZED');
    }
    if (payment.expires_at && new Date(payment.expires_at).getTime() <= Date.now()) {
      throw new Error('PAYMENT_EXPIRED');
    }

    return paymentRepository.markSucceeded({
      paymentCode,
      gatewayTransactionId:
        normalizeOptionalString(body.gatewayTransactionId) ?? generateGatewayTransactionId(),
      gatewayReference: normalizeOptionalString(body.gatewayReference) ?? paymentCode,
      metadataJson: JSON.stringify(body),
      note: normalizeOptionalString(body.note) ?? 'Payment confirmed',
      actorUserId: actor.id,
      actorRole: actor.role,
    });
  },

  async fail(paymentCode: string, body: Record<string, unknown>, actor: PaymentActor) {
    const payment = await paymentRepository.getByCode(paymentCode);
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (isPayOSProvider(payment.provider) || isZaloPayProvider(payment.provider)) {
      throw new Error('PAYMENT_PROVIDER_MANAGED');
    }

    if (String(payment.status) === 'SUCCEEDED') throw new Error('PAYMENT_CANNOT_FAIL');
    if (String(payment.status) === 'REFUNDED') throw new Error('PAYMENT_ALREADY_REFUNDED');
    if (
      String(payment.status) === 'FAILED' ||
      String(payment.status) === 'CANCELLED' ||
      String(payment.status) === 'EXPIRED'
    ) {
      throw new Error('PAYMENT_FINALIZED');
    }

    return paymentRepository.markFailed({
      paymentCode,
      failureReason: normalizeOptionalString(body.failureReason) ?? 'Payment rejected',
      metadataJson: JSON.stringify(body),
      note: normalizeOptionalString(body.note) ?? 'Payment failed',
      actorUserId: actor.id,
      actorRole: actor.role,
    });
  },

  async refund(paymentCode: string, body: Record<string, unknown>, actor: PaymentActor) {
    const payment = await paymentRepository.getByCode(paymentCode);
    if (!payment) throw new Error('PAYMENT_NOT_FOUND');
    if (isPayOSProvider(payment.provider) || isZaloPayProvider(payment.provider)) {
      throw new Error('PAYMENT_PROVIDER_UNSUPPORTED');
    }

    if (String(payment.status) === 'REFUNDED') throw new Error('PAYMENT_ALREADY_REFUNDED');
    if (String(payment.status) !== 'SUCCEEDED') throw new Error('PAYMENT_CANNOT_REFUND');

    return paymentRepository.refund({
      paymentCode,
      refundReason: normalizeOptionalString(body.refundReason) ?? 'Manual refund',
      metadataJson: JSON.stringify(body),
      note: normalizeOptionalString(body.note) ?? 'Payment refunded',
      actorUserId: actor.id,
      actorRole: actor.role,
    });
  },
};
