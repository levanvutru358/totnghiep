import {
  DEFAULT_ORDER_PAYMENT_METHOD,
  isOrderFulfillmentStatus,
  isOrderPaymentMethod,
  isOrderPaymentStatus,
  isOrderStatus,
  type OrderPaymentMethod,
  type OrderStatus,
} from '../constants/orders';
import { UserRole } from '../constants/roles';
import {
  orderRepository,
  type CreateOrderInput,
  type OrderListFilters,
  type UpdateOrderStateInput,
} from '../repositories/order.repository';
import { notificationRepository } from '../repositories/notification.repository';
import { paymentRepository } from '../repositories/payment.repository';
import { promotionService } from './promotion.service';
import { addressService } from './address.service';

interface OrderActor {
  id: number;
  email: string;
  role: UserRole;
}

const customerCancelableStatuses = new Set<OrderStatus>([
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
]);

const adminCancelableStatuses = new Set<OrderStatus>([
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PACKED',
]);

const returnableStatuses = new Set<OrderStatus>(['DELIVERED', 'COMPLETED']);

const refundableStatuses = new Set<OrderStatus>([
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'DELIVERED',
  'COMPLETED',
]);

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const toNonNegativeNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'undefined' || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) throw new Error('INVALID_NUMBER');
  return Number(parsed.toFixed(2));
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | null | undefined => {
  if (typeof value === 'undefined') return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const isAdminActor = (actor: OrderActor): boolean => actor.role !== UserRole.CUSTOMER;

const generateOrderCode = (): string => {
  const now = new Date();
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
    now.getDate(),
  ).padStart(2, '0')}`;
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(
    2,
    '0',
  )}${String(now.getSeconds()).padStart(2, '0')}`;
  const randomPart = Math.random().toString().slice(2, 8);
  return `ORD-${datePart}-${timePart}-${randomPart}`;
};

const getScopedIdentifier = (actor: OrderActor) =>
  actor.role === UserRole.CUSTOMER ? { userId: actor.id } : undefined;

const isOrderPaid = (order: { payment_status?: unknown }) => {
  const paymentStatus = String(order.payment_status);
  return paymentStatus === 'PAID' || paymentStatus === 'PARTIALLY_REFUNDED';
};

const assertPlacedOrderPaid = (order: { status?: unknown; payment_status?: unknown }) => {
  if (String(order.status) !== 'PLACED') return;
  if (!isOrderPaid(order)) {
    throw new Error('PAYMENT_REQUIRED_BEFORE_CONFIRMATION');
  }
};

const assertPaidOrderForAdminStatusChange = (order: { payment_status?: unknown }) => {
  if (!isOrderPaid(order)) {
    throw new Error('PAYMENT_REQUIRED_BEFORE_CONFIRMATION');
  }
};

const buildShippingMeta = (
  order: Record<string, unknown>,
  body: Record<string, unknown>,
) => {
  const shippingCarrier =
    normalizeOptionalString(body.shippingCarrier) ??
    normalizeOptionalString(order.shipping_carrier) ??
    'GHN';
  const trackingNumber =
    normalizeOptionalString(body.trackingNumber) ??
    normalizeOptionalString(order.tracking_number) ??
    `AUTO-${String(order.order_code)}-${Date.now().toString().slice(-6)}`;

  return { shippingCarrier, trackingNumber };
};

const orderStatusCustomerLabels: Partial<Record<OrderStatus, string>> = {
  PLACED: 'Đã đặt hàng',
  CONFIRMED: 'Đã xác nhận',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  RETURN_REQUESTED: 'Yêu cầu trả hàng',
};

const notifyCustomerOrderStatus = async (
  order: Record<string, unknown>,
  status: OrderStatus,
  note?: string | null,
) => {
  const userId = Number(order.user_id);
  if (!Number.isFinite(userId) || userId <= 0) return;

  const label = orderStatusCustomerLabels[status] ?? status;
  const orderCode = String(order.order_code ?? '');

  try {
    await notificationRepository.create({
      userId,
      type: 'ORDER_STATUS',
      title: `Đơn ${orderCode}: ${label}`,
      body: note?.trim() || `Đơn hàng của bạn hiện ở trạng thái "${label}".`,
      referenceType: 'ORDER',
      referenceId: Number(order.id),
    });
  } catch {
    // Do not block admin updates when notification insert fails.
  }
};

const finishAdminStatusUpdate = async (
  updated: Record<string, unknown>,
  actor: OrderActor,
  notifyStatus: OrderStatus,
  note?: string | null,
) => {
  if (isAdminActor(actor)) {
    await notifyCustomerOrderStatus(updated, notifyStatus, note);
  }

  return {
    ...updated,
    capabilities: buildCapabilities(updated, actor),
  };
};

const buildCapabilities = (order: any, actor: OrderActor) => {
  const status = order.status as OrderStatus;
  const isOwner = Number(order.user_id) === actor.id;
  const admin = isAdminActor(actor);
  const canManageManualPayment = admin && String(order.payment_method) === 'COD';
  const paid = isOrderPaid(order);

  return {
    canCancel: admin
      ? adminCancelableStatuses.has(status)
      : isOwner && customerCancelableStatuses.has(status),
    canComplete:
      (admin && status === 'DELIVERED') ||
      (isOwner &&
        isOrderPaid(order) &&
        (status === 'DELIVERED' || status === 'SHIPPED')),
    canRequestReturn: (admin || isOwner) && returnableStatuses.has(status),
    canSetStatusFromPlaced: admin && status === 'PLACED' && paid,
    canAdminUpdateOrderStatus:
      admin &&
      paid &&
      ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(status),
    canManageLifecycle:
      admin && ['CONFIRMED', 'PACKED', 'SHIPPED'].includes(status),
    canMarkPaid:
      canManageManualPayment &&
      order.payment_status !== 'PAID' &&
      order.payment_status !== 'REFUNDED' &&
      status !== 'CANCELLED' &&
      status !== 'REFUNDED',
    canRefund:
      canManageManualPayment &&
      (order.payment_status === 'PAID' || order.payment_status === 'PARTIALLY_REFUNDED') &&
      refundableStatuses.has(status),
    canApproveReturn: admin && status === 'RETURN_REQUESTED',
  };
};

const decorateListResult = (result: any, actor: OrderActor) => ({
  ...result,
  items: result.items.map((item: any) => ({
    ...item,
    capabilities: buildCapabilities(item, actor),
  })),
});

const parseAddress = (body: Record<string, unknown>) => {
  const address =
    typeof body.shippingAddress === 'object' && body.shippingAddress !== null
      ? (body.shippingAddress as Record<string, unknown>)
      : {};

  const line1 =
    normalizeString(address.line1) || normalizeString(address.addressLine1) || normalizeString(body.shippingAddressLine1);
  const line2 =
    normalizeOptionalString(address.line2) ??
    normalizeOptionalString(address.addressLine2) ??
    normalizeOptionalString(body.shippingAddressLine2) ??
    null;
  const ward =
    normalizeOptionalString(address.ward) ??
    normalizeOptionalString(body.shippingWard) ??
    null;
  const district =
    normalizeString(address.district) || normalizeString(body.shippingDistrict);
  const province =
    normalizeString(address.province) || normalizeString(body.shippingProvince);
  const postalCode =
    normalizeOptionalString(address.postalCode) ??
    normalizeOptionalString(body.shippingPostalCode) ??
    null;
  const country =
    normalizeOptionalString(address.country) ??
    normalizeOptionalString(body.shippingCountry) ??
    'VN';

  return {
    line1,
    line2,
    ward,
    district,
    province,
    postalCode,
    country,
  };
};

const normalizeItems = (
  items: unknown,
): Array<{ variantId: number; quantity: number }> => {
  if (!Array.isArray(items) || items.length === 0) throw new Error('MISSING_ITEMS');

  const aggregated = new Map<number, number>();

  items.forEach((rawItem) => {
    if (typeof rawItem !== 'object' || rawItem === null) {
      throw new Error('INVALID_ORDER_ITEM');
    }

    const item = rawItem as Record<string, unknown>;
    const variantId = Number(item.variantId);
    const quantity = Number(item.quantity);

    if (!Number.isInteger(variantId) || variantId <= 0) throw new Error('INVALID_VARIANT_ID');
    if (!Number.isInteger(quantity) || quantity <= 0) throw new Error('INVALID_QUANTITY');

    aggregated.set(variantId, (aggregated.get(variantId) ?? 0) + quantity);
  });

  return Array.from(aggregated.entries()).map(([variantId, quantity]) => ({
    variantId,
    quantity,
  }));
};

const getOrderOrThrow = async (identifier: string, actor: OrderActor) => {
  const order = await orderRepository.getDetailByIdOrCode(identifier, getScopedIdentifier(actor));
  if (!order) throw new Error('ORDER_NOT_FOUND');
  return order;
};

const getAdminOrderOrThrow = async (identifier: string) => {
  const order = await orderRepository.getDetailByIdOrCode(identifier);
  if (!order) throw new Error('ORDER_NOT_FOUND');
  return order;
};

const buildActorMeta = (actor: OrderActor) => ({
  actorUserId: actor.id,
  actorRole: actor.role,
  actorLabel: actor.email,
});

const buildDetailedReason = (body: Record<string, unknown>): string | null => {
  const reasonCode = normalizeOptionalString(body.reasonCode);
  const reason = normalizeOptionalString(body.reason);
  const detail = normalizeOptionalString(body.detail);
  const note = normalizeOptionalString(body.note);

  const parts = [reasonCode, reason, detail, note].filter(
    (value, index, items): value is string => Boolean(value) && items.indexOf(value) === index,
  );

  if (parts.length === 0) return null;
  return parts.join(' | ');
};

const truncateText = (value: string | null, limit: number): string | null =>
  value && value.length > limit ? value.slice(0, limit) : value;

const resolveReturnRejectionStatus = (order: any): OrderStatus => {
  if (!Array.isArray(order.history)) return 'DELIVERED';

  for (let index = order.history.length - 1; index >= 0; index -= 1) {
    const entry = order.history[index];
    if (String(entry.status) === 'RETURN_REQUESTED') continue;

    const status = String(entry.status) as OrderStatus;
    if (status === 'COMPLETED' || status === 'DELIVERED') {
      return status;
    }
  }

  return 'DELIVERED';
};

const getReturnRequestState = (status: unknown): 'PENDING' | 'APPROVED' | 'REJECTED' => {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'RETURN_REQUESTED') return 'PENDING';
  if (normalized === 'RETURNED' || normalized === 'REFUNDED') return 'APPROVED';
  return 'REJECTED';
};

const escapeCsvCell = (value: unknown): string => {
  const normalized = value === null || typeof value === 'undefined' ? '' : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

const toCsv = (headers: string[], rows: Array<Record<string, unknown>>): string => {
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((header) => escapeCsvCell(row[header])).join(',')),
  ];
  return lines.join('\r\n');
};

export const orderService = {
  async list(query: Record<string, unknown>, actor: OrderActor) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);

    const filters: OrderListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      status: isOrderStatus(query.status) ? query.status : undefined,
      paymentStatus: isOrderPaymentStatus(query.paymentStatus)
        ? query.paymentStatus
        : undefined,
      fulfillmentStatus: isOrderFulfillmentStatus(query.fulfillmentStatus)
        ? query.fulfillmentStatus
        : undefined,
      paymentMethod: isOrderPaymentMethod(query.paymentMethod)
        ? query.paymentMethod
        : undefined,
      userId: toPositiveNumber(query.userId),
      createdFrom: typeof query.createdFrom === 'string' ? query.createdFrom : undefined,
      createdTo: typeof query.createdTo === 'string' ? query.createdTo : undefined,
      page,
      limit,
    };

    const result = await orderRepository.list(filters);
    return decorateListResult(result, actor);
  },

  async listMine(query: Record<string, unknown>, actor: OrderActor) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);

    const filters: OrderListFilters = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      status: isOrderStatus(query.status) ? query.status : undefined,
      paymentStatus: isOrderPaymentStatus(query.paymentStatus)
        ? query.paymentStatus
        : undefined,
      fulfillmentStatus: isOrderFulfillmentStatus(query.fulfillmentStatus)
        ? query.fulfillmentStatus
        : undefined,
      paymentMethod: isOrderPaymentMethod(query.paymentMethod)
        ? query.paymentMethod
        : undefined,
      createdFrom: typeof query.createdFrom === 'string' ? query.createdFrom : undefined,
      createdTo: typeof query.createdTo === 'string' ? query.createdTo : undefined,
      page,
      limit,
    };

    const result = await orderRepository.list(filters, { userId: actor.id });
    return decorateListResult(result, actor);
  },

  async detail(identifier: string, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);
    return {
      ...order,
      capabilities: buildCapabilities(order, actor),
    };
  },

  async status(identifier: string, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);

    return {
      id: Number(order.id),
      orderCode: String(order.order_code),
      status: String(order.status),
      paymentStatus: String(order.payment_status),
      fulfillmentStatus: String(order.fulfillment_status),
      paymentMethod: String(order.payment_method),
      cancelReason: order.cancel_reason ? String(order.cancel_reason) : null,
      shippingCarrier: order.shipping_carrier ? String(order.shipping_carrier) : null,
      trackingNumber: order.tracking_number ? String(order.tracking_number) : null,
      timestamps: {
        placedAt: order.placed_at,
        confirmedAt: order.confirmed_at,
        packedAt: order.packed_at,
        shippedAt: order.shipped_at,
        deliveredAt: order.delivered_at,
        completedAt: order.completed_at,
        cancelledAt: order.cancelled_at,
        returnRequestedAt: order.return_requested_at,
        returnedAt: order.returned_at,
        refundedAt: order.refunded_at,
        updatedAt: order.updated_at,
      },
      capabilities: buildCapabilities(order, actor),
    };
  },

  async timeline(identifier: string, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);

    return {
      id: Number(order.id),
      orderCode: String(order.order_code),
      status: String(order.status),
      paymentStatus: String(order.payment_status),
      fulfillmentStatus: String(order.fulfillment_status),
      timeline: Array.isArray(order.history) ? order.history : [],
    };
  },

  async invoice(identifier: string, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);
    const payments = await paymentRepository.listByOrder(
      Number(order.id),
      getScopedIdentifier(actor),
    );

    return {
      invoiceNumber: `INV-${String(order.order_code)}`,
      issuedAt:
        order.completed_at ??
        order.delivered_at ??
        order.confirmed_at ??
        order.placed_at ??
        order.created_at,
      order: {
        id: Number(order.id),
        orderCode: String(order.order_code),
        status: String(order.status),
        paymentStatus: String(order.payment_status),
        fulfillmentStatus: String(order.fulfillment_status),
        paymentMethod: String(order.payment_method),
        createdAt: order.created_at,
      },
      customer: {
        id: Number(order.user_id),
        email: order.user_email ? String(order.user_email) : null,
        fullName: order.user_full_name ? String(order.user_full_name) : null,
      },
      recipient: {
        name: order.recipient_name ? String(order.recipient_name) : null,
        phone: order.recipient_phone ? String(order.recipient_phone) : null,
        email: order.recipient_email ? String(order.recipient_email) : null,
      },
      shippingAddress: {
        line1: order.shipping_address_line1 ? String(order.shipping_address_line1) : null,
        line2: order.shipping_address_line2 ? String(order.shipping_address_line2) : null,
        ward: order.shipping_ward ? String(order.shipping_ward) : null,
        district: order.shipping_district ? String(order.shipping_district) : null,
        province: order.shipping_province ? String(order.shipping_province) : null,
        postalCode: order.shipping_postal_code ? String(order.shipping_postal_code) : null,
        country: order.shipping_country ? String(order.shipping_country) : null,
      },
      amounts: {
        subtotal: Number(order.subtotal || 0),
        discountAmount: Number(order.discount_amount || 0),
        shippingFee: Number(order.shipping_fee || 0),
        totalAmount: Number(order.total_amount || 0),
        currencyCode: order.currency_code ? String(order.currency_code) : 'VND',
      },
      items: Array.isArray(order.items) ? order.items : [],
      payments,
    };
  },

  async create(body: Record<string, unknown>, actor: OrderActor) {
    const items = normalizeItems(body.items);
    const paymentMethod = isOrderPaymentMethod(body.paymentMethod)
      ? body.paymentMethod
      : DEFAULT_ORDER_PAYMENT_METHOD;

    const recipientName = normalizeString(body.recipientName);
    const recipientPhone = normalizeString(body.recipientPhone);
    const recipientEmail =
      normalizeOptionalString(body.recipientEmail) ?? actor.email ?? null;
    const shippingMethod = normalizeOptionalString(body.shippingMethod) ?? 'Standard';
    const shippingCarrier = normalizeOptionalString(body.shippingCarrier) ?? null;
    const trackingNumber = normalizeOptionalString(body.trackingNumber) ?? null;
    let voucherCode = normalizeOptionalString(body.voucherCode) ?? null;
    const note = normalizeOptionalString(body.note) ?? null;
    const customerNote = normalizeOptionalString(body.customerNote) ?? null;
    const adminNote = normalizeOptionalString(body.adminNote) ?? null;
    let shippingFee = toNonNegativeNumber(body.shippingFee, 0);
    let discountAmount = toNonNegativeNumber(body.discountAmount, 0);
    const providedSubtotal = toNonNegativeNumber(body.subtotal, 0);
    let promotionId: number | null = null;
    const currencyCode = (normalizeString(body.currencyCode) || 'VND').slice(0, 3).toUpperCase();

    const address = parseAddress(body);

    if (!recipientName) throw new Error('MISSING_RECIPIENTNAME');
    if (!recipientPhone) throw new Error('MISSING_RECIPIENTPHONE');
    if (!address.line1) throw new Error('MISSING_SHIPPING_ADDRESS');
    if (!address.district) throw new Error('MISSING_SHIPPING_DISTRICT');
    if (!address.province) throw new Error('MISSING_SHIPPING_PROVINCE');

    if (voucherCode) {
      const subtotal =
        providedSubtotal > 0
          ? providedSubtotal
          : await orderRepository.estimateItemsSubtotal(items);
      const applied = await promotionService.resolveForCheckout({
        code: voucherCode,
        userId: actor.id,
        subtotal,
        shippingFee,
      });
      voucherCode = applied.code;
      shippingFee = applied.shippingFee;
      promotionId = applied.promotionId;
      // For CART checkout, discountAmount may already include marketing delta + voucher.
      // Preserve provided discount when present to keep totals equal to preview.
      if (discountAmount <= 0) {
        discountAmount = applied.discountAmount;
      }
    }

    const initialStatus: OrderStatus =
      paymentMethod === 'COD' ? 'PLACED' : 'PENDING_PAYMENT';

    const input: CreateOrderInput = {
      orderCode: generateOrderCode(),
      userId: actor.id,
      status: initialStatus,
      paymentStatus: 'UNPAID',
      fulfillmentStatus: 'UNFULFILLED',
      paymentMethod: paymentMethod as OrderPaymentMethod,
      shippingMethod,
      shippingCarrier,
      trackingNumber,
      voucherCode,
      recipientName,
      recipientPhone,
      recipientEmail,
      shippingAddressLine1: address.line1,
      shippingAddressLine2: address.line2 ?? null,
      shippingWard: address.ward ?? null,
      shippingDistrict: address.district,
      shippingProvince: address.province,
      shippingPostalCode: address.postalCode ?? null,
      shippingCountry: address.country ?? 'VN',
      note,
      customerNote,
      adminNote,
      discountAmount,
      shippingFee,
      currencyCode,
      items,
      historyAction: 'ORDER_CREATED',
      historyNote:
        initialStatus === 'PENDING_PAYMENT'
          ? 'Order created and waiting for payment'
          : 'Order created successfully',
      ...buildActorMeta(actor),
    };

    const order = await orderRepository.create(input);

    if (promotionId) {
      await promotionService.recordOrderUsage(promotionId, actor.id, Number(order.id));
    }

    try {
      await addressService.saveFromCheckout(actor.id, body);
    } catch {
      // Do not block order creation when address book save fails.
    }

    return {
      ...order,
      capabilities: buildCapabilities(order, actor),
    };
  },

  async updateStatus(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getAdminOrderOrThrow(identifier);
    const nextStatus = isOrderStatus(body.status) ? body.status : undefined;
    const note = normalizeOptionalString(body.note) ?? null;
    const adminNote = normalizeOptionalString(body.adminNote);
    const shippingCarrier = normalizeOptionalString(body.shippingCarrier);
    const trackingNumber = normalizeOptionalString(body.trackingNumber);
    const now = new Date();

    const baseInput: UpdateOrderStateInput = {
      orderId: Number(order.id),
      historyAction: 'ORDER_STATUS_UPDATED',
      historyNote: note,
      adminNote,
      ...buildActorMeta(actor),
    };

    if (order.status === 'PLACED') {
      assertPlacedOrderPaid(order);

      if (!nextStatus) throw new Error('INVALID_ORDER_STATUS');

      if (nextStatus === 'CANCELLED') {
        return this.cancel(identifier, body, actor);
      }

      if (nextStatus === 'RETURN_REQUESTED') {
        const reason = buildDetailedReason(body);
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'RETURN_REQUESTED',
          returnRequestedAt: now,
          historyAction: 'RETURN_REQUESTED',
          historyNote: reason ?? note ?? 'Return requested by admin',
        });

        return finishAdminStatusUpdate(
          updated,
          actor,
          'RETURN_REQUESTED',
          reason ?? note ?? undefined,
        );
      }

      if (nextStatus === 'CONFIRMED') {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'CONFIRMED',
          fulfillmentStatus: 'PROCESSING',
          confirmedAt: now,
          historyAction: 'ORDER_CONFIRMED',
          historyNote: note ?? 'Order confirmed',
        });

        return finishAdminStatusUpdate(updated, actor, 'CONFIRMED', note);
      }

      if (nextStatus === 'SHIPPED') {
        const carrier = shippingCarrier ?? 'GHN';
        const tracking =
          trackingNumber ?? `AUTO-${String(order.order_code)}-${Date.now().toString().slice(-6)}`;

        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'SHIPPED',
          fulfillmentStatus: 'SHIPPED',
          confirmedAt: now,
          packedAt: now,
          shippedAt: now,
          shippingCarrier: carrier,
          trackingNumber: tracking,
          historyAction: 'ORDER_SHIPPED',
          historyNote: note ?? 'Order shipped (admin update from placed)',
        });

        return finishAdminStatusUpdate(updated, actor, 'SHIPPED', note);
      }

      if (nextStatus === 'DELIVERED') {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'DELIVERED',
          fulfillmentStatus: 'DELIVERED',
          confirmedAt: now,
          packedAt: now,
          shippedAt: now,
          deliveredAt: now,
          historyAction: 'ORDER_DELIVERED',
          historyNote: note ?? 'Order delivered (admin update from placed)',
        });

        return finishAdminStatusUpdate(updated, actor, 'DELIVERED', note);
      }

      if (nextStatus === 'COMPLETED') {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'COMPLETED',
          fulfillmentStatus: 'DELIVERED',
          confirmedAt: now,
          packedAt: now,
          shippedAt: now,
          deliveredAt: now,
          completedAt: now,
          historyAction: 'ORDER_COMPLETED',
          historyNote: note ?? 'Order completed (admin update from placed)',
        });

        return finishAdminStatusUpdate(updated, actor, 'COMPLETED', note);
      }

      throw new Error('INVALID_ORDER_STATUS');
    }

    const currentStatus = String(order.status) as OrderStatus;

    if (
      isOrderPaid(order) &&
      isAdminActor(actor) &&
      ['CONFIRMED', 'PACKED', 'SHIPPED'].includes(currentStatus)
    ) {
      assertPaidOrderForAdminStatusChange(order);
      if (!nextStatus) throw new Error('INVALID_ORDER_STATUS');

      if (nextStatus === 'CANCELLED') {
        return this.cancel(identifier, body, actor);
      }

      if (nextStatus === 'RETURN_REQUESTED') {
        const reason = buildDetailedReason(body);
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'RETURN_REQUESTED',
          returnRequestedAt: now,
          historyAction: 'RETURN_REQUESTED',
          historyNote: reason ?? note ?? 'Return requested by admin',
        });

        return finishAdminStatusUpdate(
          updated,
          actor,
          'RETURN_REQUESTED',
          reason ?? note ?? undefined,
        );
      }

      const { shippingCarrier, trackingNumber } = buildShippingMeta(order, body);

      if (
        nextStatus === 'SHIPPED' &&
        (currentStatus === 'CONFIRMED' || currentStatus === 'PACKED')
      ) {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'SHIPPED',
          fulfillmentStatus: 'SHIPPED',
          confirmedAt: order.confirmed_at ?? now,
          packedAt: order.packed_at ?? now,
          shippedAt: now,
          shippingCarrier,
          trackingNumber,
          historyAction: 'ORDER_SHIPPED',
          historyNote: note ?? 'Order shipped (admin status update)',
        });

        return finishAdminStatusUpdate(updated, actor, 'SHIPPED', note);
      }

      if (
        nextStatus === 'DELIVERED' &&
        ['CONFIRMED', 'PACKED', 'SHIPPED'].includes(currentStatus)
      ) {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'DELIVERED',
          fulfillmentStatus: 'DELIVERED',
          confirmedAt: order.confirmed_at ?? now,
          packedAt: order.packed_at ?? now,
          shippedAt: order.shipped_at ?? now,
          deliveredAt: now,
          shippingCarrier: order.shipping_carrier ?? shippingCarrier,
          trackingNumber: order.tracking_number ?? trackingNumber,
          historyAction: 'ORDER_DELIVERED',
          historyNote: note ?? 'Order delivered (admin status update)',
        });

        return finishAdminStatusUpdate(updated, actor, 'DELIVERED', note);
      }

      if (
        nextStatus === 'COMPLETED' &&
        ['CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(currentStatus)
      ) {
        const updated = await orderRepository.updateState({
          ...baseInput,
          status: 'COMPLETED',
          fulfillmentStatus: 'DELIVERED',
          confirmedAt: order.confirmed_at ?? now,
          packedAt: order.packed_at ?? now,
          shippedAt: order.shipped_at ?? now,
          deliveredAt: order.delivered_at ?? now,
          completedAt: now,
          shippingCarrier: order.shipping_carrier ?? shippingCarrier,
          trackingNumber: order.tracking_number ?? trackingNumber,
          historyAction: 'ORDER_COMPLETED',
          historyNote: note ?? 'Order completed (admin status update)',
        });

        return finishAdminStatusUpdate(updated, actor, 'COMPLETED', note);
      }
    }

    if (
      isOrderPaid(order) &&
      isAdminActor(actor) &&
      currentStatus === 'DELIVERED' &&
      nextStatus === 'COMPLETED'
    ) {
      const updated = await orderRepository.updateState({
        ...baseInput,
        status: 'COMPLETED',
        completedAt: now,
        historyAction: 'ORDER_COMPLETED',
        historyNote: note ?? 'Order completed (admin status update)',
      });

      return finishAdminStatusUpdate(updated, actor, 'COMPLETED', note);
    }

    if (
      nextStatus !== 'CONFIRMED' &&
      nextStatus !== 'PACKED' &&
      nextStatus !== 'SHIPPED' &&
      nextStatus !== 'DELIVERED'
    ) {
      throw new Error('INVALID_ORDER_STATUS');
    }

    if (nextStatus === 'CONFIRMED') {
      if (order.status !== 'PLACED') throw new Error('INVALID_ORDER_TRANSITION');
      assertPlacedOrderPaid(order);

      const updated = await orderRepository.updateState({
        ...baseInput,
        status: 'CONFIRMED',
        fulfillmentStatus: 'PROCESSING',
        confirmedAt: now,
        historyAction: 'ORDER_CONFIRMED',
        historyNote: note ?? 'Order confirmed',
      });

      return finishAdminStatusUpdate(updated, actor, 'CONFIRMED', note);
    }

    if (nextStatus === 'PACKED') {
      if (order.status !== 'CONFIRMED') throw new Error('INVALID_ORDER_TRANSITION');

      const updated = await orderRepository.updateState({
        ...baseInput,
        status: 'PACKED',
        fulfillmentStatus: 'PACKED',
        packedAt: now,
        historyAction: 'ORDER_PACKED',
        historyNote: note ?? 'Order packed',
      });

      return finishAdminStatusUpdate(updated, actor, 'PACKED', note);
    }

    if (nextStatus === 'SHIPPED') {
      if (order.status !== 'PACKED') throw new Error('INVALID_ORDER_TRANSITION');

      const shipMeta = buildShippingMeta(order, body);
      const updated = await orderRepository.updateState({
        ...baseInput,
        status: 'SHIPPED',
        fulfillmentStatus: 'SHIPPED',
        shippingCarrier: shipMeta.shippingCarrier,
        trackingNumber: shipMeta.trackingNumber,
        shippedAt: now,
        historyAction: 'ORDER_SHIPPED',
        historyNote: note ?? 'Order shipped',
      });

      return finishAdminStatusUpdate(updated, actor, 'SHIPPED', note);
    }

    if (order.status !== 'SHIPPED') throw new Error('INVALID_ORDER_TRANSITION');

    const updated = await orderRepository.updateState({
      ...baseInput,
      status: 'DELIVERED',
      fulfillmentStatus: 'DELIVERED',
      deliveredAt: now,
      historyAction: 'ORDER_DELIVERED',
      historyNote: note ?? 'Order delivered',
    });

    return finishAdminStatusUpdate(updated, actor, 'DELIVERED', note);
  },

  async cancel(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);
    const reason = buildDetailedReason(body);
    const now = new Date();
    const admin = isAdminActor(actor);

    if (order.status === 'CANCELLED' || order.status === 'REFUNDED') {
      throw new Error('INVALID_ORDER_TRANSITION');
    }

    const allowed = admin ? adminCancelableStatuses : customerCancelableStatuses;
    if (!allowed.has(order.status as OrderStatus)) {
      throw new Error('FORBIDDEN_ORDER_ACTION');
    }

    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: 'CANCELLED',
      fulfillmentStatus: 'CANCELLED',
      cancelReason: truncateText(reason, 255),
      cancelledAt: now,
      historyAction: 'ORDER_CANCELLED',
      historyNote: reason ?? 'Order cancelled',
      restockItems: true,
      restockNote: reason ?? 'Order cancelled and stock restored',
      ...buildActorMeta(actor),
    });

    return finishAdminStatusUpdate(updated, actor, 'CANCELLED', reason);
  },

  async complete(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);
    const note = normalizeOptionalString(body.note) ?? null;
    const status = String(order.status) as OrderStatus;
    const now = new Date();
    const admin = isAdminActor(actor);
    const isOwner = Number(order.user_id) === actor.id;

    if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'REFUNDED') {
      throw new Error('INVALID_ORDER_TRANSITION');
    }

    if (admin) {
      if (status !== 'DELIVERED') throw new Error('INVALID_ORDER_TRANSITION');
    } else if (!isOwner) {
      throw new Error('FORBIDDEN_ORDER_ACTION');
    } else if (!isOrderPaid(order)) {
      throw new Error('PAYMENT_REQUIRED_BEFORE_CONFIRMATION');
    } else if (status !== 'DELIVERED' && status !== 'SHIPPED') {
      throw new Error('INVALID_ORDER_TRANSITION');
    }

    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: 'COMPLETED',
      fulfillmentStatus: 'DELIVERED',
      shippedAt: order.shipped_at ?? (status === 'SHIPPED' ? now : undefined),
      deliveredAt: order.delivered_at ?? now,
      completedAt: now,
      historyAction: 'ORDER_COMPLETED',
      historyNote:
        note ??
        (admin ? 'Order completed' : 'Khách xác nhận đã nhận hàng và hoàn tất đơn'),
      ...buildActorMeta(actor),
    });

    const result = await finishAdminStatusUpdate(updated, actor, 'COMPLETED', note);

    if (!admin && isOwner) {
      await notifyCustomerOrderStatus(updated, 'COMPLETED', note);
    }

    return result;
  },

  async refund(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getAdminOrderOrThrow(identifier);
    const note = normalizeOptionalString(body.note) ?? null;

    if (String(order.payment_method) !== 'COD') {
      throw new Error('ORDER_PAYMENT_MANAGED_BY_PAYMENT_API');
    }
    if (order.payment_status === 'REFUNDED') throw new Error('ORDER_ALREADY_REFUNDED');
    if (order.payment_status !== 'PAID' && order.payment_status !== 'PARTIALLY_REFUNDED') {
      throw new Error('ORDER_NOT_REFUNDABLE');
    }
    if (!refundableStatuses.has(order.status as OrderStatus)) {
      throw new Error('ORDER_NOT_REFUNDABLE');
    }

    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: 'REFUNDED',
      paymentStatus: 'REFUNDED',
      refundedAt: new Date(),
      historyAction: 'PAYMENT_REFUNDED',
      historyNote: note ?? 'Payment refunded',
      ...buildActorMeta(actor),
    });

    return {
      ...updated,
      capabilities: buildCapabilities(updated, actor),
    };
  },

  async requestReturn(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getOrderOrThrow(identifier, actor);
    const note = buildDetailedReason(body);

    if (!returnableStatuses.has(order.status as OrderStatus)) {
      throw new Error('INVALID_ORDER_TRANSITION');
    }

    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: 'RETURN_REQUESTED',
      returnRequestedAt: new Date(),
      historyAction: 'RETURN_REQUESTED',
      historyNote: note ?? 'Return requested',
      ...buildActorMeta(actor),
    });

    return {
      ...updated,
      capabilities: buildCapabilities(updated, actor),
    };
  },

  async approveReturn(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getAdminOrderOrThrow(identifier);
    const note = normalizeOptionalString(body.note) ?? null;

    if (order.status !== 'RETURN_REQUESTED') throw new Error('INVALID_ORDER_TRANSITION');

    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: 'RETURNED',
      fulfillmentStatus: 'RETURNED',
      returnedAt: new Date(),
      historyAction: 'RETURN_APPROVED',
      historyNote: note ?? 'Return approved and stock restored',
      restockItems: true,
      restockNote: note ?? 'Returned order restocked',
      ...buildActorMeta(actor),
    });

    return {
      ...updated,
      capabilities: buildCapabilities(updated, actor),
    };
  },

  async rejectReturn(identifier: string, body: Record<string, unknown>, actor: OrderActor) {
    const order = await getAdminOrderOrThrow(identifier);
    const note = normalizeOptionalString(body.note) ?? null;

    if (order.status !== 'RETURN_REQUESTED') throw new Error('INVALID_ORDER_TRANSITION');

    const restoredStatus = resolveReturnRejectionStatus(order);
    const updated = await orderRepository.updateState({
      orderId: Number(order.id),
      status: restoredStatus,
      historyAction: 'RETURN_REJECTED',
      historyNote: note ?? 'Return request rejected',
      ...buildActorMeta(actor),
    });

    return {
      ...updated,
      capabilities: buildCapabilities(updated, actor),
    };
  },

  async listReturnRequests(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);

    const result = await orderRepository.listReturnRequests({
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      page,
      limit,
    });

    return {
      ...result,
      items: result.items.map((item: any) => ({
        id: Number(item.return_id),
        orderId: Number(item.order_id),
        orderCode: String(item.order_code),
        state: getReturnRequestState(item.order_status),
        requestedAt: item.requested_at,
        reason: item.return_reason ? String(item.return_reason) : null,
        orderStatus: String(item.order_status),
        paymentStatus: String(item.payment_status),
        fulfillmentStatus: String(item.fulfillment_status),
        paymentMethod: String(item.payment_method),
        totalAmount: Number(item.total_amount || 0),
        currencyCode: item.currency_code ? String(item.currency_code) : 'VND',
        user: {
          id: Number(item.user_id),
          email: item.user_email ? String(item.user_email) : null,
          fullName: item.user_full_name ? String(item.user_full_name) : null,
        },
        recipient: {
          name: item.recipient_name ? String(item.recipient_name) : null,
          phone: item.recipient_phone ? String(item.recipient_phone) : null,
          email: item.recipient_email ? String(item.recipient_email) : null,
        },
      })),
    };
  },

  async detailReturnRequest(returnId: number) {
    if (!Number.isInteger(returnId) || returnId <= 0) {
      throw new Error('INVALID_RETURN_ID');
    }

    const request = await orderRepository.getReturnRequestById(returnId);
    if (!request) throw new Error('RETURN_REQUEST_NOT_FOUND');

    const order = await orderRepository.getDetailById(Number(request.order_id));
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const resolution = Array.isArray(order.history)
      ? order.history.find(
          (entry: any) =>
            Number(entry.id) > returnId &&
            (String(entry.action) === 'RETURN_APPROVED' ||
              String(entry.action) === 'RETURN_REJECTED'),
        )
      : null;

    return {
      id: Number(request.return_id),
      state: getReturnRequestState(order.status),
      requestedAt: request.requested_at,
      reason: request.return_reason ? String(request.return_reason) : null,
      order: {
        ...order,
        capabilities: {
          canApproveReturn: false,
        },
      },
      resolution: resolution
        ? {
            action: String(resolution.action),
            note: resolution.note ? String(resolution.note) : null,
            createdAt: resolution.created_at,
            actorUserId: resolution.actor_user_id ? Number(resolution.actor_user_id) : null,
            actorRole: resolution.actor_role ? String(resolution.actor_role) : null,
            actorEmail: resolution.actor_email ? String(resolution.actor_email) : null,
            actorFullName: resolution.actor_full_name ? String(resolution.actor_full_name) : null,
          }
        : null,
    };
  },

  async exportList(query: Record<string, unknown>) {
    const filters: Omit<OrderListFilters, 'page' | 'limit'> = {
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      status: isOrderStatus(query.status) ? query.status : undefined,
      paymentStatus: isOrderPaymentStatus(query.paymentStatus)
        ? query.paymentStatus
        : undefined,
      fulfillmentStatus: isOrderFulfillmentStatus(query.fulfillmentStatus)
        ? query.fulfillmentStatus
        : undefined,
      paymentMethod: isOrderPaymentMethod(query.paymentMethod)
        ? query.paymentMethod
        : undefined,
      userId: toPositiveNumber(query.userId),
      createdFrom: typeof query.createdFrom === 'string' ? query.createdFrom : undefined,
      createdTo: typeof query.createdTo === 'string' ? query.createdTo : undefined,
    };

    const orders = await orderRepository.listAll(filters);
    const headers = [
      'id',
      'order_code',
      'user_email',
      'user_full_name',
      'recipient_name',
      'recipient_phone',
      'status',
      'payment_status',
      'fulfillment_status',
      'payment_method',
      'subtotal',
      'discount_amount',
      'shipping_fee',
      'total_amount',
      'currency_code',
      'item_count',
      'total_quantity',
      'created_at',
      'updated_at',
    ];

    const rows = orders.map((order: any) => ({
      id: Number(order.id),
      order_code: String(order.order_code),
      user_email: order.user_email ? String(order.user_email) : '',
      user_full_name: order.user_full_name ? String(order.user_full_name) : '',
      recipient_name: order.recipient_name ? String(order.recipient_name) : '',
      recipient_phone: order.recipient_phone ? String(order.recipient_phone) : '',
      status: String(order.status),
      payment_status: String(order.payment_status),
      fulfillment_status: String(order.fulfillment_status),
      payment_method: String(order.payment_method),
      subtotal: Number(order.subtotal || 0),
      discount_amount: Number(order.discount_amount || 0),
      shipping_fee: Number(order.shipping_fee || 0),
      total_amount: Number(order.total_amount || 0),
      currency_code: order.currency_code ? String(order.currency_code) : '',
      item_count: Number(order.item_count || 0),
      total_quantity: Number(order.total_quantity || 0),
      created_at: order.created_at ? String(order.created_at) : '',
      updated_at: order.updated_at ? String(order.updated_at) : '',
    }));

    return toCsv(headers, rows);
  },
};
