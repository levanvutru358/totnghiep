import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'
import type {
  CancelOrderInput,
  CartItem,
  CheckoutSubmitInput,
  CreateOrderInput,
  OrderTimelineEntry,
  RequestReturnInput,
  ClientOrderFulfillmentStatus,
  ClientOrderPaymentStatus,
  ClientOrderStatus,
  ClientPaymentTransactionStatus,
  OrderCapabilityFlags,
  OrderRecord,
  PaymentRecord,
  PaymentMethodOption,
} from '../types/commerce.type'
import { buildCustomerOrderCapabilities } from '../lib/commerce.utils'

type ApiRecord = Record<string, unknown>

export interface CommerceCartSummary {
  itemCount: number
  totalQuantity: number
  subtotal: number
  selectedItemCount: number
  selectedQuantity: number
  selectedSubtotal: number
}

export interface CommerceCartResponse {
  id: number
  userId: number
  createdAt: string
  updatedAt: string
  summary: CommerceCartSummary
  items: CartItem[]
}

export interface PromotionApplyResult {
  promotionId: number
  code: string
  name: string
  discountType: 'FIXED' | 'PERCENT' | 'FREE_SHIPPING'
  discountAmount: number
  shippingFee: number
  subtotal: number
  totalAmount: number
}

export interface CheckoutPreviewResponse {
  source: 'CART'
  paymentMethod: 'E_WALLET'
  currencyCode: string
  shippingFee: number
  discountAmount: number
  voucherCode: string | null
  promotionNotice?: string | null
  subtotal: number
  totalAmount: number
  itemCount: number
  totalQuantity: number
  hasUnavailableItems: boolean
  items: CartItem[]
}

export interface CartValidatedItem extends CartItem {
  isValid: boolean
  issues: string[]
  suggestedQuantity: number
  availability: string
}

export interface CartValidationSummary {
  itemCount: number
  validItemCount: number
  invalidItemCount: number
  selectedItemCount: number
  selectedValidItemCount: number
  selectedInvalidItemCount: number
  hasIssues: boolean
  checkoutReady: boolean
}

export interface CartValidationResult {
  source: 'CART'
  selection: {
    itemIds: number[] | null
    selectedOnly: boolean
  }
  summary: CartValidationSummary
  items: CartValidatedItem[]
  cart: CommerceCartResponse
}

interface VariantLookupItem {
  id: string
  sku: string
  stockQuantity: number
}

const orderStatuses: ClientOrderStatus[] = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
]

const orderPaymentStatuses: ClientOrderPaymentStatus[] = [
  'UNPAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
]

const orderFulfillmentStatuses: ClientOrderFulfillmentStatus[] = [
  'UNFULFILLED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
]

const paymentStatuses: ClientPaymentTransactionStatus[] = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
]

const isRecord = (value: unknown): value is ApiRecord =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const asRecord = (value: unknown): ApiRecord => (isRecord(value) ? value : {})

const asRecordArray = (value: unknown): ApiRecord[] =>
  Array.isArray(value) ? value.filter(isRecord) : []

const toStringValue = (value: unknown, fallback = ''): string =>
  value === null || typeof value === 'undefined' ? fallback : String(value)

const toNullableString = (value: unknown): string | null =>
  value === null || typeof value === 'undefined' ? null : String(value)

const toNumberValue = (value: unknown, fallback = 0): number =>
  Number(value ?? fallback)

const toIsoString = (...values: unknown[]): string =>
  String(values.find((value) => value !== null && typeof value !== 'undefined') ?? new Date().toISOString())

const resolveOrderStatus = (value: unknown): ClientOrderStatus =>
  orderStatuses.includes(value as ClientOrderStatus) ? (value as ClientOrderStatus) : 'PENDING_PAYMENT'

const resolveOrderPaymentStatus = (value: unknown): ClientOrderPaymentStatus =>
  orderPaymentStatuses.includes(value as ClientOrderPaymentStatus)
    ? (value as ClientOrderPaymentStatus)
    : 'UNPAID'

const resolveOrderFulfillmentStatus = (value: unknown): ClientOrderFulfillmentStatus =>
  orderFulfillmentStatuses.includes(value as ClientOrderFulfillmentStatus)
    ? (value as ClientOrderFulfillmentStatus)
    : 'UNFULFILLED'

const resolvePaymentStatus = (value: unknown): ClientPaymentTransactionStatus =>
  paymentStatuses.includes(value as ClientPaymentTransactionStatus)
    ? (value as ClientPaymentTransactionStatus)
    : 'PENDING'

const resolveCapabilities = (
  value: unknown,
  status: ClientOrderStatus,
): OrderCapabilityFlags => {
  if (!isRecord(value)) {
    return buildCustomerOrderCapabilities(status)
  }

  return {
    canCancel: Boolean(value.canCancel),
    canComplete: Boolean(value.canComplete),
    canRequestReturn: Boolean(value.canRequestReturn),
    canManageLifecycle: Boolean(value.canManageLifecycle),
    canMarkPaid: Boolean(value.canMarkPaid),
    canRefund: Boolean(value.canRefund),
    canApproveReturn: Boolean(value.canApproveReturn),
  }
}

const mapCartItem = (item: unknown): CartItem => {
  const source = asRecord(item)

  return {
    cartItemId: toStringValue(source.id),
    productId: toStringValue(source.productId),
    productName: toStringValue(source.productName),
    productSlug: toStringValue(source.productSlug) || undefined,
    productCategory: toStringValue(source.categoryName),
    productBrand: toStringValue(source.brandName),
    productImage: toStringValue(source.productThumbnailUrl),
    unitPrice: toNumberValue(source.unitPrice),
    variantId: toStringValue(source.variantId),
    size: toStringValue(source.sizeLabel),
    color: toStringValue(source.colorName),
    sku: toStringValue(source.sku),
    stock: toNumberValue(source.stockQuantity),
    quantity: toNumberValue(source.quantity),
    selected: Boolean(source.selected),
    addedAt: toIsoString(source.createdAt),
    updatedAt: toIsoString(source.updatedAt, source.createdAt),
  }
}

const mapValidatedCartItem = (item: unknown): CartValidatedItem => {
  const mapped = mapCartItem(item)
  const source = asRecord(item)
  const issues = Array.isArray(source.issues)
    ? source.issues.map((issue) => String(issue))
    : []

  return {
    ...mapped,
    isValid: Boolean(source.isValid),
    issues,
    suggestedQuantity: toNumberValue(source.suggestedQuantity, mapped.quantity),
    availability: toStringValue(source.availability, 'AVAILABLE'),
  }
}

const mapVariantLookupItem = (item: unknown): VariantLookupItem => {
  const source = asRecord(item)

  return {
    id: toStringValue(source.id),
    sku: toStringValue(source.sku),
    stockQuantity: toNumberValue(source.stock_quantity ?? source.stockQuantity),
  }
}

const timelineActionLabels: Record<string, string> = {
  ORDER_CREATED: 'Đơn hàng đã tạo',
  ORDER_CONFIRMED: 'Đã xác nhận',
  ORDER_PACKED: 'Đã đóng gói',
  ORDER_SHIPPED: 'Đang giao',
  ORDER_DELIVERED: 'Đã giao',
  ORDER_COMPLETED: 'Hoàn tất',
  ORDER_CANCELLED: 'Đã hủy',
  RETURN_REQUESTED: 'Yêu cầu trả hàng',
  RETURN_APPROVED: 'Đã duyệt trả hàng',
  RETURN_REJECTED: 'Từ chối trả hàng',
  PAYMENT_SUCCEEDED: 'Thanh toán thành công',
  PAYMENT_CANCELLED: 'Thanh toán đã hủy',
  ORDER_STATUS_UPDATED: 'Cập nhật trạng thái',
}

const timelineStatusLabels: Record<string, string> = {
  PLACED: 'Đã đặt hàng',
  CONFIRMED: 'Đã xác nhận',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  RETURN_REQUESTED: 'Yêu cầu trả hàng',
}

const resolveTimelineTitle = (source: ApiRecord) => {
  const action = toStringValue(source.action)
  const status = toStringValue(source.status)
  if (action && timelineActionLabels[action]) return timelineActionLabels[action]
  if (status && timelineStatusLabels[status]) return timelineStatusLabels[status]
  return action || status || 'Cập nhật đơn hàng'
}

export const mapTimelineEntry = (entry: unknown): OrderTimelineEntry => {
  const source = asRecord(entry)

  return {
    id: toStringValue(source.id, `${toStringValue(source.action)}-${toStringValue(source.created_at)}`),
    type: toStringValue(source.action, 'ORDER_UPDATED'),
    title: resolveTimelineTitle(source),
    description: toStringValue(source.note, 'Không có ghi chú'),
    createdAt: toIsoString(source.created_at, source.createdAt),
  }
}

export interface OrderStatusSnapshot {
  id: number
  orderCode: string
  status: ClientOrderStatus
  paymentStatus: ClientOrderPaymentStatus
  fulfillmentStatus: ClientOrderFulfillmentStatus
  paymentMethod: string
  cancelReason: string | null
  timestamps: OrderRecord['timestamps']
  capabilities: OrderCapabilityFlags
}

export interface OrderInvoiceRecord {
  invoiceNumber: string
  issuedAt: string
  order: {
    orderCode: string
    status: string
    paymentStatus: string
    totalAmount: number
    currencyCode: string
  }
  amounts: {
    subtotal: number
    discountAmount: number
    shippingFee: number
    totalAmount: number
    currencyCode: string
  }
  items: ApiRecord[]
  payments: ApiRecord[]
  raw: ApiRecord
}

const mapPayment = (payment: unknown): PaymentRecord => {
  const source = asRecord(payment)

  return {
    id: toStringValue(source.id),
    paymentCode: toStringValue(source.payment_code ?? source.paymentCode),
    orderId: toStringValue(source.order_id ?? source.orderId),
    orderCode: toStringValue(source.order_code ?? source.orderCode),
    provider: (() => {
      const raw = toStringValue(source.provider, '').toUpperCase();
      return raw === 'ZALOPAY' ? 'ZALOPAY' : 'PAYOS';
    })(),
    method: 'E_WALLET',
    status: resolvePaymentStatus(source.status),
    amount: toNumberValue(source.amount),
    currencyCode: toStringValue(source.currency_code ?? source.currencyCode, 'VND'),
    checkoutUrl: toNullableString(source.checkout_url ?? source.checkoutUrl),
    qrContent: toNullableString(source.qr_content ?? source.qrContent),
    deepLink: toNullableString(source.deep_link ?? source.deepLink),
    gatewayTransactionId: toNullableString(
      source.gateway_transaction_id ?? source.gatewayTransactionId,
    ),
    gatewayReference: toNullableString(source.gateway_reference ?? source.gatewayReference),
    createdAt: toIsoString(source.created_at, source.createdAt),
    updatedAt: toIsoString(source.updated_at, source.updatedAt),
    expiresAt: toIsoString(source.expires_at, source.expiresAt),
    paidAt: toNullableString(source.paid_at ?? source.paidAt),
    failureReason: toNullableString(source.failure_reason ?? source.failureReason),
    events: asRecordArray(source.events).map((event) => ({
      id: toStringValue(event.id),
      eventType: toStringValue(event.event_type ?? event.eventType),
      status: resolvePaymentStatus(event.status),
      note: toNullableString(event.note),
      createdAt: toIsoString(event.created_at, event.createdAt),
    })),
  }
}

const mapPaymentMethod = (method: unknown): PaymentMethodOption => {
  const source = asRecord(method)

  return {
    code: 'E_WALLET',
    label: toStringValue(source.label, 'ZaloPay'),
    supportsCheckout: Boolean(source.supportsCheckout),
    defaultProvider: (() => {
      const raw = toStringValue(source.defaultProvider, '').toUpperCase();
      return raw === 'PAYOS' ? 'PAYOS' : 'ZALOPAY';
    })(),
    preferredPaymentMethod: Array.isArray(source.preferredPaymentMethod)
      ? source.preferredPaymentMethod.map((value) => String(value))
      : [],
  }
}

const mapOrder = (order: unknown): OrderRecord => {
  const source = asRecord(order)
  const status = resolveOrderStatus(source.status)
  const paymentStatus = resolveOrderPaymentStatus(source.payment_status ?? source.paymentStatus)
  const fulfillmentStatus = resolveOrderFulfillmentStatus(
    source.fulfillment_status ?? source.fulfillmentStatus,
  )
  const items = asRecordArray(source.items)

  return {
    id: toStringValue(source.id),
    orderCode: toStringValue(source.order_code ?? source.orderCode),
    source: 'cart',
    status,
    paymentStatus,
    fulfillmentStatus,
    paymentMethod: 'E_WALLET',
    paymentCode: null,
    currencyCode: toStringValue(source.currency_code ?? source.currencyCode, 'VND'),
    createdAt: toIsoString(source.created_at, source.createdAt),
    updatedAt: toIsoString(source.updated_at, source.updatedAt),
    placedAt: toIsoString(source.placed_at, source.created_at, source.createdAt),
    recipientName: toStringValue(source.recipient_name ?? source.recipientName),
    recipientPhone: toStringValue(source.recipient_phone ?? source.recipientPhone),
    recipientEmail: toStringValue(source.recipient_email ?? source.recipientEmail),
    shippingMethod: toStringValue(source.shipping_method ?? source.shippingMethod, 'Standard'),
    shippingAddressLine1: toStringValue(source.shipping_address_line1),
    shippingAddressLine2: toNullableString(source.shipping_address_line2),
    shippingWard: toNullableString(source.shipping_ward),
    shippingDistrict: toStringValue(source.shipping_district),
    shippingProvince: toStringValue(source.shipping_province),
    shippingPostalCode: toNullableString(source.shipping_postal_code),
    shippingCountry: toStringValue(source.shipping_country, 'VN'),
    shippingAddress: {
      line1: toStringValue(source.shipping_address_line1),
      line2: toNullableString(source.shipping_address_line2),
      ward: toNullableString(source.shipping_ward),
      district: toStringValue(source.shipping_district),
      province: toStringValue(source.shipping_province),
      postalCode: toNullableString(source.shipping_postal_code),
      country: toStringValue(source.shipping_country, 'VN'),
    },
    customerNote: toNullableString(source.customer_note),
    note: toNullableString(source.note),
    cancelReason: toNullableString(source.cancel_reason),
    items: items.map((item) => ({
      orderItemId: toStringValue(item.id, `${toStringValue(item.variant_id)}-${toStringValue(item.quantity)}`),
      productId: toStringValue(item.product_id),
      productName: toStringValue(item.product_name),
      productCategory: toStringValue(item.category_name),
      productBrand: toStringValue(item.brand_name),
      productImage: toStringValue(item.product_thumbnail_url),
      unitPrice: toNumberValue(item.unit_price),
      variantId: toStringValue(item.variant_id),
      size: toStringValue(item.size_label),
      color: toStringValue(item.color_name),
      sku: toStringValue(item.sku),
      stock: toNumberValue(item.stock_quantity),
      quantity: toNumberValue(item.quantity),
      lineTotal: toNumberValue(
        item.line_total,
        toNumberValue(item.unit_price) * toNumberValue(item.quantity),
      ),
    })),
    subtotal: toNumberValue(source.subtotal),
    shippingFee: toNumberValue(source.shipping_fee),
    discountAmount: toNumberValue(source.discount_amount),
    totalAmount: toNumberValue(source.total_amount),
    itemCount: toNumberValue(source.item_count),
    totalQuantity: toNumberValue(source.total_quantity),
    timeline: asRecordArray(source.history).length
      ? asRecordArray(source.history).map(mapTimelineEntry)
      : asRecordArray(source.timeline).map(mapTimelineEntry),
    timestamps: {
      placedAt: toNullableString(source.placed_at),
      confirmedAt: toNullableString(source.confirmed_at),
      packedAt: toNullableString(source.packed_at),
      shippedAt: toNullableString(source.shipped_at),
      deliveredAt: toNullableString(source.delivered_at),
      completedAt: toNullableString(source.completed_at),
      cancelledAt: toNullableString(source.cancelled_at),
      returnRequestedAt: toNullableString(source.return_requested_at),
      returnedAt: toNullableString(source.returned_at),
      refundedAt: toNullableString(source.refunded_at),
      updatedAt: toIsoString(source.updated_at, source.created_at, source.createdAt),
    },
    capabilities: resolveCapabilities(source.capabilities, status),
  }
}

export interface GuestCartMergeItem {
  variantId: number
  quantity: number
  selected?: boolean
}

const mapCommerceCartFromRecord = (data: ApiRecord): CommerceCartResponse => {
  const summary = asRecord(data.summary)

  return {
    id: toNumberValue(data.id),
    userId: toNumberValue(data.userId),
    createdAt: toIsoString(data.createdAt),
    updatedAt: toIsoString(data.updatedAt),
    summary: {
      itemCount: toNumberValue(summary.itemCount),
      totalQuantity: toNumberValue(summary.totalQuantity),
      subtotal: toNumberValue(summary.subtotal),
      selectedItemCount: toNumberValue(summary.selectedItemCount),
      selectedQuantity: toNumberValue(summary.selectedQuantity),
      selectedSubtotal: toNumberValue(summary.selectedSubtotal),
    },
    items: asRecordArray(data.items).map(mapCartItem),
  }
}

export const commerceApi = {
  hasServerToken: () =>
    Boolean(localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token')),

  addCartItem: async (payload: {
    variantId: string | number
    quantity: number
    selected?: boolean
  }): Promise<CommerceCartResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/items', {
      variantId: Number(payload.variantId),
      quantity: payload.quantity,
      selected: payload.selected ?? true,
    })
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  getVariantById: async (variantId: string | number): Promise<VariantLookupItem | null> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/variants/${variantId}`)
    return mapVariantLookupItem(response.data.data)
  },

  findVariantBySku: async (sku: string): Promise<VariantLookupItem | null> => {
    const query = new URLSearchParams({
      sku,
      page: '1',
      limit: '10',
    })
    const response = await http.get<ApiResponse<{ items?: ApiRecord[] }>>(
      `/variants?${query.toString()}`,
    )
    const items = Array.isArray(response.data.data.items)
      ? response.data.data.items.map(mapVariantLookupItem)
      : []

    return items.find((item) => item.sku === sku) ?? items[0] ?? null
  },

  addCartItemBySku: async (
    sku: string,
    quantity: number,
    selected = true,
  ): Promise<CommerceCartResponse> => {
    const variant = await commerceApi.findVariantBySku(sku)
    if (!variant) throw new Error('Không tìm thấy phiên bản sản phẩm.')
    if (variant.stockQuantity <= 0) throw new Error('Sản phẩm này đã hết hàng.')

    return commerceApi.addCartItem({
      variantId: variant.id,
      quantity: Math.min(quantity, variant.stockQuantity),
      selected,
    })
  },

  getPaymentMethods: async (): Promise<PaymentMethodOption[]> => {
    const response = await http.get<ApiResponse<ApiRecord[]>>('/payments/methods')
    return Array.isArray(response.data.data) ? response.data.data.map(mapPaymentMethod) : []
  },

  getCart: async (): Promise<CommerceCartResponse> => {
    const response = await http.get<ApiResponse<ApiRecord>>('/cart')
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  mergeGuestCart: async (items: GuestCartMergeItem[]): Promise<CommerceCartResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/merge', {
      items: items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        selected: item.selected ?? true,
      })),
    })
    const data = asRecord(response.data.data)
    return mapCommerceCartFromRecord(asRecord(data.cart))
  },

  validateCart: async (payload?: {
    itemIds?: string[]
    selectedOnly?: boolean
  }): Promise<CartValidationResult> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/validate', {
      itemIds: payload?.itemIds?.map((itemId) => Number(itemId)),
      selectedOnly: payload?.selectedOnly,
    })
    const data = asRecord(response.data.data)
    const summary = asRecord(data.summary)
    const selection = asRecord(data.selection)

    return {
      source: 'CART',
      selection: {
        itemIds: Array.isArray(selection.itemIds)
          ? selection.itemIds.map((itemId) => Number(itemId))
          : null,
        selectedOnly: Boolean(selection.selectedOnly),
      },
      summary: {
        itemCount: toNumberValue(summary.itemCount),
        validItemCount: toNumberValue(summary.validItemCount),
        invalidItemCount: toNumberValue(summary.invalidItemCount),
        selectedItemCount: toNumberValue(summary.selectedItemCount),
        selectedValidItemCount: toNumberValue(summary.selectedValidItemCount),
        selectedInvalidItemCount: toNumberValue(summary.selectedInvalidItemCount),
        hasIssues: Boolean(summary.hasIssues),
        checkoutReady: Boolean(summary.checkoutReady),
      },
      items: asRecordArray(data.items).map(mapValidatedCartItem),
      cart: mapCommerceCartFromRecord(asRecord(data.cart)),
    }
  },

  updateCartItem: async (
    itemId: string,
    payload: { quantity?: number; selected?: boolean },
  ): Promise<CommerceCartResponse> => {
    const response = await http.patch<ApiResponse<ApiRecord>>(`/cart/items/${itemId}`, payload)
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  removeCartItem: async (itemId: string): Promise<CommerceCartResponse> => {
    const response = await http.delete<ApiResponse<ApiRecord>>(`/cart/items/${itemId}`)
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  selectAllCartItems: async (selected: boolean): Promise<CommerceCartResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/select-all', { selected })
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  selectCartItems: async (itemIds: string[], selected: boolean): Promise<CommerceCartResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/select', {
      itemIds: itemIds.map((itemId) => Number(itemId)),
      selected,
    })
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  clearCart: async (payload?: { selectedOnly?: boolean; itemIds?: string[] }): Promise<CommerceCartResponse> => {
    const response = await http.delete<ApiResponse<ApiRecord>>('/cart', {
      data: {
        selectedOnly: payload?.selectedOnly,
        itemIds: payload?.itemIds?.map((itemId) => Number(itemId)),
      },
    })
    return mapCommerceCartFromRecord(asRecord(response.data.data))
  },

  validatePromotion: async (payload: {
    code: string
    subtotal: number
    shippingFee: number
  }): Promise<PromotionApplyResult> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/promotions/validate', payload)
    const data = asRecord(response.data.data)
    return {
      promotionId: toNumberValue(data.promotionId),
      code: toStringValue(data.code),
      name: toStringValue(data.name),
      discountType: toStringValue(data.discountType, 'FIXED') as PromotionApplyResult['discountType'],
      discountAmount: toNumberValue(data.discountAmount),
      shippingFee: toNumberValue(data.shippingFee),
      subtotal: toNumberValue(data.subtotal),
      totalAmount: toNumberValue(data.totalAmount),
    }
  },

  previewCheckout: async (payload: {
    itemIds?: string[]
    paymentMethod: 'E_WALLET'
    shippingFee?: number
    voucherCode?: string
    currencyCode: string
  }): Promise<CheckoutPreviewResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/checkout/preview', {
      itemIds: payload.itemIds?.map((itemId) => Number(itemId)),
      paymentMethod: payload.paymentMethod,
      ...(payload.shippingFee != null ? { shippingFee: payload.shippingFee } : {}),
      voucherCode: payload.voucherCode,
      currencyCode: payload.currencyCode,
    })
    const data = asRecord(response.data.data)

    return {
      source: 'CART',
      paymentMethod: 'E_WALLET',
      currencyCode: toStringValue(data.currencyCode, payload.currencyCode),
      shippingFee: toNumberValue(data.shippingFee),
      discountAmount: toNumberValue(data.discountAmount),
      voucherCode: data.voucherCode ? toStringValue(data.voucherCode) : null,
      promotionNotice:
        data.promotionNotice == null && data.promotion_notice == null
          ? null
          : String(data.promotionNotice ?? data.promotion_notice ?? ''),
      subtotal: toNumberValue(data.subtotal),
      totalAmount: toNumberValue(data.totalAmount),
      itemCount: toNumberValue(data.itemCount),
      totalQuantity: toNumberValue(data.totalQuantity),
      hasUnavailableItems: Boolean(data.hasUnavailableItems),
      items: asRecordArray(data.items).map(mapCartItem),
    }
  },

  checkoutFromCart: async (payload: {
    itemIds?: string[]
    body: CheckoutSubmitInput
  }): Promise<{ order: OrderRecord; payment: PaymentRecord | null }> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/cart/checkout', {
      itemIds: payload.itemIds?.map((itemId) => Number(itemId)),
      paymentMethod: payload.body.paymentMethod,
      provider: payload.body.provider,
      recipientName: payload.body.recipientName,
      recipientPhone: payload.body.recipientPhone,
      recipientEmail: payload.body.recipientEmail,
      shippingFee: payload.body.shippingFee,
      subtotal: payload.body.subtotal,
      discountAmount: payload.body.discountAmount,
      voucherCode: payload.body.voucherCode,
      saveAddress: payload.body.saveAddress,
      shippingMethod: payload.body.shippingMethod,
      customerNote: payload.body.customerNote,
      note: payload.body.note,
      shippingAddress: payload.body.shippingAddress,
      returnUrl: payload.body.returnUrl,
      cancelUrl: payload.body.cancelUrl,
    })
    const data = asRecord(response.data.data)

    return {
      order: mapOrder(data.order),
      payment: data.payment ? mapPayment(data.payment) : null,
    }
  },

  listMyOrders: async (): Promise<OrderRecord[]> => {
    const response = await http.get<ApiResponse<{ items?: ApiRecord[] }>>('/orders/my')
    return Array.isArray(response.data.data.items)
      ? response.data.data.items.map(mapOrder)
      : []
  },

  getOrderDetail: async (orderCode: string): Promise<OrderRecord> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/orders/${orderCode}`)
    return mapOrder(response.data.data)
  },

  cancelOrder: async (orderCode: string, payload?: CancelOrderInput): Promise<OrderRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(
      `/orders/${orderCode}/cancel`,
      payload ?? {},
    )
    return mapOrder(response.data.data)
  },

  createOrder: async (
    payload: CreateOrderInput,
  ): Promise<{ order: OrderRecord; payment: PaymentRecord | null }> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/orders', {
      source: payload.source ?? 'BUY_NOW',
      items: payload.items,
      paymentMethod: payload.paymentMethod,
      provider: payload.provider,
      recipientName: payload.recipientName,
      recipientPhone: payload.recipientPhone,
      recipientEmail: payload.recipientEmail,
      shippingFee: payload.shippingFee,
      subtotal: payload.subtotal,
      discountAmount: payload.discountAmount,
      voucherCode: payload.voucherCode,
      saveAddress: payload.saveAddress,
      shippingMethod: payload.shippingMethod,
      customerNote: payload.customerNote,
      note: payload.note,
      currencyCode: payload.currencyCode ?? 'VND',
      shippingAddress: payload.shippingAddress,
      returnUrl: payload.returnUrl,
      cancelUrl: payload.cancelUrl,
    })
    const data = asRecord(response.data.data)
    const order = mapOrder(data)

    let payment: PaymentRecord | null = null
    if (payload.paymentMethod === 'E_WALLET') {
      payment = await commerceApi.createPaymentCheckout(order.orderCode, payload)
    }

    return { order, payment }
  },

  getOrderStatus: async (orderCode: string): Promise<OrderStatusSnapshot> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/orders/${orderCode}/status`)
    const data = asRecord(response.data.data)
    const timestamps = asRecord(data.timestamps)

    return {
      id: toNumberValue(data.id),
      orderCode: toStringValue(data.orderCode ?? data.order_code),
      status: resolveOrderStatus(data.status),
      paymentStatus: resolveOrderPaymentStatus(data.payment_status ?? data.paymentStatus),
      fulfillmentStatus: resolveOrderFulfillmentStatus(
        data.fulfillment_status ?? data.fulfillmentStatus,
      ),
      paymentMethod: toStringValue(data.paymentMethod ?? data.payment_method, 'E_WALLET'),
      cancelReason: toNullableString(data.cancel_reason ?? data.cancelReason),
      timestamps: {
        placedAt: toNullableString(timestamps.placed_at ?? timestamps.placedAt),
        confirmedAt: toNullableString(timestamps.confirmed_at ?? timestamps.confirmedAt),
        packedAt: toNullableString(timestamps.packed_at ?? timestamps.packedAt),
        shippedAt: toNullableString(timestamps.shipped_at ?? timestamps.shippedAt),
        deliveredAt: toNullableString(timestamps.delivered_at ?? timestamps.deliveredAt),
        completedAt: toNullableString(timestamps.completed_at ?? timestamps.completedAt),
        cancelledAt: toNullableString(timestamps.cancelled_at ?? timestamps.cancelledAt),
        returnRequestedAt: toNullableString(
          timestamps.return_requested_at ?? timestamps.returnRequestedAt,
        ),
        returnedAt: toNullableString(timestamps.returned_at ?? timestamps.returnedAt),
        refundedAt: toNullableString(timestamps.refunded_at ?? timestamps.refundedAt),
        updatedAt: toIsoString(timestamps.updated_at, timestamps.updatedAt),
      },
      capabilities: resolveCapabilities(data.capabilities, resolveOrderStatus(data.status)),
    }
  },

  getOrderTimeline: async (
    orderCode: string,
  ): Promise<{ orderCode: string; status: ClientOrderStatus; timeline: OrderTimelineEntry[] }> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/orders/${orderCode}/timeline`)
    const data = asRecord(response.data.data)

    return {
      orderCode: toStringValue(data.orderCode ?? data.order_code),
      status: resolveOrderStatus(data.status),
      timeline: asRecordArray(data.timeline).map(mapTimelineEntry),
    }
  },

  getOrderInvoice: async (orderCode: string): Promise<OrderInvoiceRecord> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/orders/${orderCode}/invoice`)
    const data = asRecord(response.data.data)
    const order = asRecord(data.order)
    const amounts = asRecord(data.amounts)

    return {
      invoiceNumber: toStringValue(data.invoiceNumber ?? data.invoice_number),
      issuedAt: toIsoString(data.issuedAt ?? data.issued_at),
      order: {
        orderCode: toStringValue(order.orderCode ?? order.order_code),
        status: toStringValue(order.status),
        paymentStatus: toStringValue(order.payment_status ?? order.paymentStatus),
        totalAmount: toNumberValue(amounts.total_amount ?? amounts.totalAmount),
        currencyCode: toStringValue(amounts.currency_code ?? amounts.currencyCode, 'VND'),
      },
      amounts: {
        subtotal: toNumberValue(amounts.subtotal),
        discountAmount: toNumberValue(amounts.discount_amount ?? amounts.discountAmount),
        shippingFee: toNumberValue(amounts.shipping_fee ?? amounts.shippingFee),
        totalAmount: toNumberValue(amounts.total_amount ?? amounts.totalAmount),
        currencyCode: toStringValue(amounts.currency_code ?? amounts.currencyCode, 'VND'),
      },
      items: asRecordArray(data.items),
      payments: asRecordArray(data.payments),
      raw: data,
    }
  },

  reorderToCart: async (orderCode: string): Promise<CommerceCartResponse> => {
    const response = await http.post<ApiResponse<ApiRecord>>(`/orders/${orderCode}/reorder`)
    const data = asRecord(response.data.data)
    return mapCommerceCartFromRecord(asRecord(data.cart))
  },

  completeOrder: async (orderCode: string, note?: string): Promise<OrderRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(`/orders/${orderCode}/complete`, {
      note: note ?? null,
    })
    return mapOrder(response.data.data)
  },

  requestOrderReturn: async (
    orderCode: string,
    payload?: RequestReturnInput,
  ): Promise<OrderRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(
      `/orders/${orderCode}/returns/request`,
      payload ?? {},
    )
    return mapOrder(response.data.data)
  },

  getPaymentDetail: async (paymentCode: string): Promise<PaymentRecord> => {
    const response = await http.get<ApiResponse<ApiRecord>>(`/payments/${paymentCode}`)
    return mapPayment(response.data.data)
  },

  loadOrderDetailEnriched: async (orderCode: string): Promise<OrderRecord> => {
    const [detail, timelineResult] = await Promise.all([
      commerceApi.getOrderDetail(orderCode),
      commerceApi.getOrderTimeline(orderCode).catch(() => null),
    ])

    if (timelineResult && timelineResult.timeline.length > 0) {
      return {
        ...detail,
        timeline: timelineResult.timeline,
      }
    }

    return detail
  },

  buyNowViaCart: async (
    variantId: string | number,
    quantity: number,
  ): Promise<{ cartItemId: string; cart: CommerceCartResponse }> => {
    const cart = await commerceApi.addCartItem({
      variantId,
      quantity,
      selected: true,
    })
    const item =
      cart.items.find((row) => row.variantId === String(variantId)) ?? cart.items[0]

    if (!item) {
      throw new Error('Không tìm thấy sản phẩm vừa thêm trong giỏ hàng.')
    }

    return { cartItemId: item.cartItemId, cart }
  },

  listPaymentsByOrder: async (orderCode: string): Promise<PaymentRecord[]> => {
    const response = await http.get<ApiResponse<ApiRecord[]>>(`/payments/orders/${orderCode}`)
    return Array.isArray(response.data.data) ? response.data.data.map(mapPayment) : []
  },

  createPaymentCheckout: async (
    orderCode: string,
    payload: Partial<CheckoutSubmitInput> = {},
  ): Promise<PaymentRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(
      `/payments/orders/${orderCode}/checkout`,
      {
        provider: payload.provider,
        recipientName: payload.recipientName,
        recipientPhone: payload.recipientPhone,
        recipientEmail: payload.recipientEmail,
        returnUrl: payload.returnUrl,
        cancelUrl: payload.cancelUrl,
        shippingAddress: payload.shippingAddress,
      },
    )
    return mapPayment(response.data.data)
  },

  retryPaymentCheckout: async (
    orderCode: string,
    payload: Partial<CheckoutSubmitInput> = {},
  ): Promise<PaymentRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(
      `/payments/orders/${orderCode}/retry`,
      {
        provider: payload.provider,
        recipientName: payload.recipientName,
        recipientPhone: payload.recipientPhone,
        recipientEmail: payload.recipientEmail,
        returnUrl: payload.returnUrl,
        cancelUrl: payload.cancelUrl,
        shippingAddress: payload.shippingAddress,
      },
    )
    return mapPayment(response.data.data)
  },

  resolvePaymentReturn: async (
    query: Record<string, string>,
  ): Promise<{ order: OrderRecord; payment: PaymentRecord }> => {
    const response = await http.get<ApiResponse<ApiRecord>>('/payments/return/resolve', {
      params: query,
    })
    const data = asRecord(response.data.data)
    return {
      order: mapOrder(data.order),
      payment: mapPayment(data.payment),
    }
  },

  syncPayment: async (paymentCode: string): Promise<PaymentRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(`/payments/${paymentCode}/sync`)
    const data = asRecord(response.data.data)
    return mapPayment(data.payment ?? data)
  },

  cancelPayment: async (
    paymentCode: string,
    payload: { cancelReason?: string; cancellationReason?: string; note?: string } = {},
  ): Promise<PaymentRecord> => {
    const response = await http.post<ApiResponse<ApiRecord>>(
      `/payments/${paymentCode}/cancel`,
      payload,
    )
    const data = asRecord(response.data.data)
    return mapPayment(data.payment ?? data)
  },
}
