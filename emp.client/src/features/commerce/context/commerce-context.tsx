import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { ProductItem, ProductVariant } from '../../products/types/product.type'
import {
  buildCancelReasonText,
  buildCustomerOrderCapabilities,
  canCustomerCancelOrder,
  paymentMethodOptions,
} from '../lib/commerce.utils'
import type {
  AddToCartInput,
  CancelOrderInput,
  CartItem,
  CheckoutDraft,
  CheckoutSubmitInput,
  CommerceState,
  OrderLineItem,
  OrderRecord,
  OrderTimelineEntry,
  PaymentEventRecord,
  PaymentMethodOption,
  PaymentRecord,
  ShippingAddress,
} from '../types/commerce.type'

const STORAGE_KEY = 'emp.client.commerce.v1'

const initialState: CommerceState = {
  cartItems: [],
  checkoutDraft: null,
  orders: [],
  payments: [],
}

const nowIso = () => new Date().toISOString()

const addMinutes = (value: string, minutes: number) =>
  new Date(new Date(value).getTime() + minutes * 60 * 1000).toISOString()

const generateToken = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const generateOrderCode = () => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}${String(now.getDate()).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes(),
  ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `ORD-${datePart}-${timePart}-${Math.random().toString().slice(2, 8)}`
}

const generatePaymentCode = () => {
  const now = new Date()
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(
    2,
    '0',
  )}${String(now.getDate()).padStart(2, '0')}`
  const timePart = `${String(now.getHours()).padStart(2, '0')}${String(
    now.getMinutes(),
  ).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
  return `PAY-${datePart}-${timePart}-${Math.random().toString().slice(2, 8)}`
}

const generateGatewayTransactionId = () =>
  `payos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const generateGatewayReference = () =>
  `${Date.now()}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`

const toSnapshot = (product: ProductItem, variant: ProductVariant) => ({
  productId: product.id,
  productName: product.name,
  productCategory: product.category,
  productBrand: product.brand,
  productImage: product.image,
  unitPrice: product.price,
  variantId: variant.id,
  size: variant.size,
  color: variant.color,
  sku: variant.sku,
  stock: variant.stock,
})

const toCartItem = (input: AddToCartInput): CartItem => {
  const quantity = Math.min(Math.max(1, input.quantity), input.variant.stock)
  const timestamp = nowIso()

  return {
    cartItemId: generateToken('cart'),
    ...toSnapshot(input.product, input.variant),
    quantity,
    selected: input.selected ?? true,
    addedAt: timestamp,
    updatedAt: timestamp,
  }
}

const toOrderLineItem = (item: CartItem): OrderLineItem => ({
  orderItemId: generateToken('line'),
  productId: item.productId,
  productName: item.productName,
  productCategory: item.productCategory,
  productBrand: item.productBrand,
  productImage: item.productImage,
  unitPrice: item.unitPrice,
  variantId: item.variantId,
  size: item.size,
  color: item.color,
  sku: item.sku,
  stock: item.stock,
  quantity: item.quantity,
  lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)),
})

const createTimelineEntry = (
  type: string,
  title: string,
  description: string,
  createdAt = nowIso(),
): OrderTimelineEntry => ({
  id: generateToken('timeline'),
  type,
  title,
  description,
  createdAt,
})

const orderStatuses = [
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
] as const

const orderPaymentStatuses = [
  'UNPAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
] as const

const orderFulfillmentStatuses = [
  'UNFULFILLED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const

const paymentStatuses = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
] as const

const buildShippingAddress = (input: {
  shippingAddress?: Partial<ShippingAddress> | null
  shippingAddressLine1?: string | null
  shippingAddressLine2?: string | null
  shippingWard?: string | null
  shippingDistrict?: string | null
  shippingProvince?: string | null
  shippingPostalCode?: string | null
  shippingCountry?: string | null
}): ShippingAddress => ({
  line1: input.shippingAddress?.line1 ?? input.shippingAddressLine1 ?? '',
  line2: input.shippingAddress?.line2 ?? input.shippingAddressLine2 ?? null,
  ward: input.shippingAddress?.ward ?? input.shippingWard ?? null,
  district: input.shippingAddress?.district ?? input.shippingDistrict ?? '',
  province: input.shippingAddress?.province ?? input.shippingProvince ?? '',
  postalCode: input.shippingAddress?.postalCode ?? input.shippingPostalCode ?? null,
  country: input.shippingAddress?.country ?? input.shippingCountry ?? 'VN',
})

const createPaymentEvent = (
  eventType: string,
  status: PaymentRecord['status'],
  note: string | null,
  createdAt = nowIso(),
): PaymentEventRecord => ({
  id: generateToken('payment-event'),
  eventType,
  status,
  note,
  createdAt,
})

const normalizeTimelineEntry = (entry: any): OrderTimelineEntry => ({
  id: String(entry?.id ?? generateToken('timeline')),
  type: String(entry?.type ?? entry?.action ?? 'ORDER_UPDATED'),
  title: String(entry?.title ?? entry?.action ?? entry?.status ?? 'Cập nhật đơn hàng'),
  description: String(entry?.description ?? entry?.note ?? 'No detail provided'),
  createdAt: String(entry?.createdAt ?? entry?.created_at ?? nowIso()),
})

const normalizePaymentEvent = (entry: any): PaymentEventRecord => ({
  id: String(entry?.id ?? generateToken('payment-event')),
  eventType: String(entry?.eventType ?? entry?.event_type ?? 'CHECKOUT_CREATED'),
  status: paymentStatuses.includes(entry?.status)
    ? entry.status
    : 'PENDING',
  note:
    typeof entry?.note === 'string' && entry.note.trim().length > 0
      ? entry.note
      : null,
  createdAt: String(entry?.createdAt ?? entry?.created_at ?? nowIso()),
})

const normalizePaymentRecord = (payment: any): PaymentRecord => {
  const createdAt = String(payment?.createdAt ?? payment?.created_at ?? nowIso())
  const status = paymentStatuses.includes(payment?.status) ? payment.status : 'PENDING'
  const events = Array.isArray(payment?.events)
    ? payment.events.map(normalizePaymentEvent)
    : [
        createPaymentEvent(
          'CHECKOUT_CREATED',
          status,
          typeof payment?.failureReason === 'string'
            ? payment.failureReason
            : 'Payment checkout created',
          createdAt,
        ),
      ]

  return {
    id: String(payment?.id ?? generateToken('payment')),
    paymentCode: String(payment?.paymentCode ?? payment?.payment_code ?? generatePaymentCode()),
    orderId: String(payment?.orderId ?? payment?.order_id ?? ''),
    orderCode: String(payment?.orderCode ?? payment?.order_code ?? ''),
    provider:
      String(payment?.provider ?? '').toUpperCase() === 'PAYOS' ? 'PAYOS' : 'ZALOPAY',
    method: 'E_WALLET',
    status,
    amount: Number(payment?.amount ?? 0),
    currencyCode: String(payment?.currencyCode ?? payment?.currency_code ?? 'USD'),
    checkoutUrl: payment?.checkoutUrl ?? payment?.checkout_url ?? null,
    qrContent: payment?.qrContent ?? payment?.qr_content ?? null,
    deepLink: payment?.deepLink ?? payment?.deep_link ?? null,
    gatewayTransactionId:
      payment?.gatewayTransactionId ?? payment?.gateway_transaction_id ?? null,
    gatewayReference: payment?.gatewayReference ?? payment?.gateway_reference ?? null,
    createdAt,
    updatedAt: String(payment?.updatedAt ?? payment?.updated_at ?? createdAt),
    expiresAt: String(payment?.expiresAt ?? payment?.expires_at ?? addMinutes(createdAt, 15)),
    paidAt: payment?.paidAt ?? payment?.paid_at ?? null,
    failureReason: payment?.failureReason ?? payment?.failure_reason ?? null,
    events,
  }
}

const normalizeOrderRecord = (order: any): OrderRecord => {
  const createdAt = String(order?.createdAt ?? order?.created_at ?? nowIso())
  const shippingAddress = buildShippingAddress({
    shippingAddress: order?.shippingAddress,
    shippingAddressLine1: order?.shippingAddressLine1 ?? order?.shipping_address_line1,
    shippingAddressLine2: order?.shippingAddressLine2 ?? order?.shipping_address_line2,
    shippingWard: order?.shippingWard ?? order?.shipping_ward,
    shippingDistrict: order?.shippingDistrict ?? order?.shipping_district,
    shippingProvince: order?.shippingProvince ?? order?.shipping_province,
    shippingPostalCode: order?.shippingPostalCode ?? order?.shipping_postal_code,
    shippingCountry: order?.shippingCountry ?? order?.shipping_country,
  })
  const status = orderStatuses.includes(order?.status) ? order.status : 'PENDING_PAYMENT'
  const paymentStatus = orderPaymentStatuses.includes(order?.paymentStatus)
    ? order.paymentStatus
    : orderPaymentStatuses.includes(order?.payment_status)
      ? order.payment_status
      : 'UNPAID'
  const fulfillmentStatus = orderFulfillmentStatuses.includes(order?.fulfillmentStatus)
    ? order.fulfillmentStatus
    : orderFulfillmentStatuses.includes(order?.fulfillment_status)
      ? order.fulfillment_status
      : 'UNFULFILLED'
  const updatedAt = String(order?.updatedAt ?? order?.updated_at ?? createdAt)
  const timestamps = {
    placedAt: order?.timestamps?.placedAt ?? order?.placedAt ?? order?.placed_at ?? createdAt,
    confirmedAt: order?.timestamps?.confirmedAt ?? order?.confirmedAt ?? order?.confirmed_at ?? null,
    packedAt: order?.timestamps?.packedAt ?? order?.packedAt ?? order?.packed_at ?? null,
    shippedAt: order?.timestamps?.shippedAt ?? order?.shippedAt ?? order?.shipped_at ?? null,
    deliveredAt:
      order?.timestamps?.deliveredAt ?? order?.deliveredAt ?? order?.delivered_at ?? null,
    completedAt:
      order?.timestamps?.completedAt ?? order?.completedAt ?? order?.completed_at ?? null,
    cancelledAt:
      order?.timestamps?.cancelledAt ?? order?.cancelledAt ?? order?.cancelled_at ?? null,
    returnRequestedAt:
      order?.timestamps?.returnRequestedAt ??
      order?.returnRequestedAt ??
      order?.return_requested_at ??
      null,
    returnedAt: order?.timestamps?.returnedAt ?? order?.returnedAt ?? order?.returned_at ?? null,
    refundedAt: order?.timestamps?.refundedAt ?? order?.refundedAt ?? order?.refunded_at ?? null,
    updatedAt,
  }

  return {
    id: String(order?.id ?? generateToken('order')),
    orderCode: String(order?.orderCode ?? order?.order_code ?? generateOrderCode()),
    source: order?.source === 'buy_now' ? 'buy_now' : 'cart',
    status,
    paymentStatus,
    fulfillmentStatus,
    paymentMethod: 'E_WALLET',
    paymentCode: order?.paymentCode ?? order?.payment_code ?? null,
    currencyCode: String(order?.currencyCode ?? order?.currency_code ?? 'USD'),
    createdAt,
    updatedAt,
    placedAt: String(timestamps.placedAt ?? createdAt),
    recipientName: String(order?.recipientName ?? order?.recipient_name ?? ''),
    recipientPhone: String(order?.recipientPhone ?? order?.recipient_phone ?? ''),
    recipientEmail: String(order?.recipientEmail ?? order?.recipient_email ?? ''),
    shippingMethod: String(order?.shippingMethod ?? order?.shipping_method ?? 'Standard'),
    shippingAddressLine1: shippingAddress.line1,
    shippingAddressLine2: shippingAddress.line2,
    shippingWard: shippingAddress.ward,
    shippingDistrict: shippingAddress.district,
    shippingProvince: shippingAddress.province,
    shippingPostalCode: shippingAddress.postalCode,
    shippingCountry: shippingAddress.country,
    shippingAddress,
    customerNote: order?.customerNote ?? order?.customer_note ?? null,
    note: order?.note ?? null,
    cancelReason: order?.cancelReason ?? order?.cancel_reason ?? null,
    items: Array.isArray(order?.items) ? order.items : [],
    subtotal: Number(order?.subtotal ?? 0),
    shippingFee: Number(order?.shippingFee ?? order?.shipping_fee ?? 0),
    discountAmount: Number(order?.discountAmount ?? order?.discount_amount ?? 0),
    totalAmount: Number(order?.totalAmount ?? order?.total_amount ?? 0),
    itemCount: Number(order?.itemCount ?? order?.item_count ?? order?.items?.length ?? 0),
    totalQuantity: Number(
      order?.totalQuantity ??
        order?.total_quantity ??
        (Array.isArray(order?.items)
          ? order.items.reduce(
              (sum: number, item: { quantity?: number }) => sum + Number(item.quantity ?? 0),
              0,
            )
          : 0),
    ),
    timeline: Array.isArray(order?.timeline)
      ? order.timeline.map(normalizeTimelineEntry)
      : Array.isArray(order?.history)
        ? order.history.map(normalizeTimelineEntry)
        : [],
    timestamps,
    capabilities: order?.capabilities ?? buildCustomerOrderCapabilities(status),
  }
}

const withDerivedOrderFields = (order: OrderRecord): OrderRecord => ({
  ...order,
  shippingAddress: buildShippingAddress({
    shippingAddress: order.shippingAddress,
    shippingAddressLine1: order.shippingAddressLine1,
    shippingAddressLine2: order.shippingAddressLine2,
    shippingWard: order.shippingWard,
    shippingDistrict: order.shippingDistrict,
    shippingProvince: order.shippingProvince,
    shippingPostalCode: order.shippingPostalCode,
    shippingCountry: order.shippingCountry,
  }),
  timestamps: {
    ...order.timestamps,
    updatedAt: order.updatedAt,
  },
  capabilities: buildCustomerOrderCapabilities(order.status),
})

const readState = (): CommerceState => {
  if (typeof window === 'undefined') return initialState

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return initialState

    const parsed = JSON.parse(raw) as Partial<CommerceState>
    return {
      cartItems: Array.isArray(parsed.cartItems) ? parsed.cartItems : [],
      checkoutDraft:
        parsed.checkoutDraft && typeof parsed.checkoutDraft === 'object'
          ? ({
              ...(parsed.checkoutDraft as CheckoutDraft),
              paymentMethod:
                (parsed.checkoutDraft as CheckoutDraft).paymentMethod ?? 'E_WALLET',
            } satisfies CheckoutDraft)
          : null,
      orders: Array.isArray(parsed.orders) ? parsed.orders.map(normalizeOrderRecord) : [],
      payments: Array.isArray(parsed.payments)
        ? parsed.payments.map(normalizePaymentRecord)
        : [],
    }
  } catch {
    return initialState
  }
}

const persistState = (state: CommerceState) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

type CommerceContextValue = {
  cartItems: CartItem[]
  cartItemCount: number
  cartQuantity: number
  selectedCartItemCount: number
  selectedCartQuantity: number
  selectedCartSubtotal: number
  checkoutDraft: CheckoutDraft | null
  orders: OrderRecord[]
  payments: PaymentRecord[]
  paymentMethods: PaymentMethodOption[]
  addToCart: (input: AddToCartInput) => void
  beginBuyNow: (input: AddToCartInput) => void
  beginCartCheckout: (itemIds?: string[]) => boolean
  clearCheckoutDraft: () => void
  updateCartItemQuantity: (cartItemId: string, quantity: number) => void
  toggleCartItem: (cartItemId: string, selected?: boolean) => void
  toggleAllCartItems: (selected: boolean) => void
  removeCartItem: (cartItemId: string) => void
  clearCart: () => void
  placeOrder: (input: CheckoutSubmitInput) => OrderRecord | null
  cancelOrder: (orderCode: string, input?: CancelOrderInput) => OrderRecord | null
  retryPayment: (orderCode: string) => OrderRecord | null
  markPaymentSucceeded: (orderCode: string) => OrderRecord | null
  markPaymentCancelled: (orderCode: string) => OrderRecord | null
  getOrderByCode: (orderCode: string) => OrderRecord | undefined
  getPaymentByOrderCode: (orderCode: string) => PaymentRecord | undefined
}

const CommerceContext = createContext<CommerceContextValue | null>(null)

export const CommerceProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<CommerceState>(readState)

  useEffect(() => {
    persistState(state)
  }, [state])

  const cartQuantity = useMemo(
    () => state.cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [state.cartItems],
  )

  const selectedCartItems = useMemo(
    () => state.cartItems.filter((item) => item.selected),
    [state.cartItems],
  )

  const selectedCartQuantity = useMemo(
    () => selectedCartItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedCartItems],
  )

  const selectedCartSubtotal = useMemo(
    () =>
      Number(
        selectedCartItems
          .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
          .toFixed(2),
      ),
    [selectedCartItems],
  )

  const addToCart = (input: AddToCartInput) => {
    setState((current) => {
      const nextQuantity = Math.min(
        input.variant.stock,
        Math.max(1, input.quantity),
      )

      if (nextQuantity <= 0) return current

      const existingIndex = current.cartItems.findIndex(
        (item) => item.variantId === input.variant.id,
      )

      if (existingIndex === -1) {
        return {
          ...current,
          cartItems: [toCartItem(input), ...current.cartItems],
        }
      }

      const existing = current.cartItems[existingIndex]
      const mergedQuantity = Math.min(
        existing.stock,
        existing.quantity + nextQuantity,
      )
      const nextItems = [...current.cartItems]
      nextItems[existingIndex] = {
        ...existing,
        quantity: mergedQuantity,
        selected: input.selected ?? existing.selected,
        updatedAt: nowIso(),
      }

      return {
        ...current,
        cartItems: nextItems,
      }
    })
  }

  const beginBuyNow = (input: AddToCartInput) => {
    const item = toCartItem({ ...input, selected: true })
    setState((current) => ({
      ...current,
      checkoutDraft: {
        id: generateToken('draft'),
        source: 'buy_now',
        items: [item],
        paymentMethod: 'E_WALLET',
        currencyCode: 'USD',
        createdAt: nowIso(),
      },
    }))
  }

  const beginCartCheckout = (itemIds?: string[]) => {
    let hasStarted = false

    setState((current) => {
      const items = itemIds?.length
        ? current.cartItems.filter((item) => itemIds.includes(item.cartItemId))
        : current.cartItems.filter((item) => item.selected)

      if (items.length === 0) return current

      hasStarted = true
      return {
        ...current,
        checkoutDraft: {
          id: generateToken('draft'),
          source: 'cart',
          items: items.map((item) => ({ ...item })),
          paymentMethod: 'E_WALLET',
          currencyCode: 'USD',
          createdAt: nowIso(),
        },
      }
    })

    return hasStarted
  }

  const clearCheckoutDraft = () => {
    setState((current) => ({
      ...current,
      checkoutDraft: null,
    }))
  }

  const updateCartItemQuantity = (cartItemId: string, quantity: number) => {
    setState((current) => ({
      ...current,
      cartItems: current.cartItems.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              quantity: Math.min(item.stock, Math.max(1, quantity)),
              updatedAt: nowIso(),
            }
          : item,
      ),
    }))
  }

  const toggleCartItem = (cartItemId: string, selected?: boolean) => {
    setState((current) => ({
      ...current,
      cartItems: current.cartItems.map((item) =>
        item.cartItemId === cartItemId
          ? {
              ...item,
              selected: selected ?? !item.selected,
              updatedAt: nowIso(),
            }
          : item,
      ),
    }))
  }

  const toggleAllCartItems = (selected: boolean) => {
    setState((current) => ({
      ...current,
      cartItems: current.cartItems.map((item) => ({
        ...item,
        selected,
        updatedAt: nowIso(),
      })),
    }))
  }

  const removeCartItem = (cartItemId: string) => {
    setState((current) => ({
      ...current,
      cartItems: current.cartItems.filter((item) => item.cartItemId !== cartItemId),
    }))
  }

  const clearCart = () => {
    setState((current) => ({
      ...current,
      cartItems: [],
    }))
  }

  const placeOrder = (input: CheckoutSubmitInput) => {
    let createdOrder: OrderRecord | null = null

    setState((current) => {
      if (!current.checkoutDraft || current.checkoutDraft.items.length === 0) {
        return current
      }

      const createdAt = nowIso()
      const orderId = generateToken('order')
      const orderCode = generateOrderCode()
      const paymentCode = generatePaymentCode()
      const items = current.checkoutDraft.items.map(toOrderLineItem)
      const subtotal = Number(
        items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
      )
      const shippingFee = Number(input.shippingFee.toFixed(2))
      const discountAmount = Number((input.discountAmount ?? 0).toFixed(2))
      const totalAmount = Number(
        Math.max(0, subtotal + shippingFee - discountAmount).toFixed(2),
      )
      const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
      const gatewayTransactionId = generateGatewayTransactionId()
      const gatewayReference = generateGatewayReference()
      const shippingAddress = buildShippingAddress({
        shippingAddress: {
          line1: input.shippingAddress.line1.trim(),
          line2: input.shippingAddress.line2?.trim() || null,
          ward: input.shippingAddress.ward?.trim() || null,
          district: input.shippingAddress.district.trim(),
          province: input.shippingAddress.province.trim(),
          postalCode: input.shippingAddress.postalCode?.trim() || null,
          country: input.shippingAddress.country?.trim() || 'VN',
        },
      })

      const payment: PaymentRecord = {
        id: generateToken('payment'),
        paymentCode,
        orderId,
        orderCode,
        provider: 'ZALOPAY',
        method: input.paymentMethod,
        status: 'PENDING',
        amount: totalAmount,
        currencyCode: current.checkoutDraft.currencyCode,
        checkoutUrl: `/payment/${orderCode}`,
        qrContent: `ZALOPAY:${gatewayReference}:${paymentCode}`,
        deepLink: null,
        gatewayTransactionId,
        gatewayReference,
        createdAt,
        updatedAt: createdAt,
        expiresAt: addMinutes(createdAt, 15),
        paidAt: null,
        failureReason: null,
        events: [
          createPaymentEvent(
            'CHECKOUT_CREATED',
            'PENDING',
            'Payment checkout created for order',
            createdAt,
          ),
        ],
      }

      createdOrder = withDerivedOrderFields({
        id: orderId,
        orderCode,
        source: current.checkoutDraft.source,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        fulfillmentStatus: 'UNFULFILLED',
        paymentMethod: input.paymentMethod,
        paymentCode,
        currencyCode: current.checkoutDraft.currencyCode,
        createdAt,
        updatedAt: createdAt,
        placedAt: createdAt,
        recipientName: input.recipientName.trim(),
        recipientPhone: input.recipientPhone.trim(),
        recipientEmail: input.recipientEmail.trim(),
        shippingMethod: input.shippingMethod?.trim() || 'Express',
        shippingAddressLine1: shippingAddress.line1,
        shippingAddressLine2: shippingAddress.line2,
        shippingWard: shippingAddress.ward,
        shippingDistrict: shippingAddress.district,
        shippingProvince: shippingAddress.province,
        shippingPostalCode: shippingAddress.postalCode,
        shippingCountry: shippingAddress.country,
        shippingAddress,
        customerNote: input.customerNote?.trim() || null,
        note: input.note?.trim() || null,
        cancelReason: null,
        items,
        subtotal,
        shippingFee,
        discountAmount,
        totalAmount,
        itemCount: items.length,
        totalQuantity,
        timeline: [
          createTimelineEntry(
            'ORDER_CREATED',
            'Đơn hàng đã được tạo',
            'Thông tin giao hàng và danh sách sản phẩm đã được ghi nhận.',
            createdAt,
          ),
          createTimelineEntry(
            'PAYMENT_WAITING',
            'Đang chờ thanh toán',
            'Vui lòng hoàn tất thanh toán để xác nhận đơn hàng.',
            createdAt,
          ),
        ],
        timestamps: {
          placedAt: createdAt,
          confirmedAt: null,
          packedAt: null,
          shippedAt: null,
          deliveredAt: null,
          completedAt: null,
          cancelledAt: null,
          returnRequestedAt: null,
          returnedAt: null,
          refundedAt: null,
          updatedAt: createdAt,
        },
        capabilities: buildCustomerOrderCapabilities('PENDING_PAYMENT'),
      })

      const draftCartItemIds = new Set(
        current.checkoutDraft.source === 'cart'
          ? current.checkoutDraft.items.map((item) => item.cartItemId)
          : [],
      )

      return {
        cartItems:
          current.checkoutDraft.source === 'cart'
            ? current.cartItems.filter(
                (item) => !draftCartItemIds.has(item.cartItemId),
              )
            : current.cartItems,
        checkoutDraft: null,
        orders: createdOrder ? [createdOrder, ...current.orders] : current.orders,
        payments: [payment, ...current.payments],
      }
    })

    return createdOrder
  }

  const cancelOrder = (orderCode: string, input?: CancelOrderInput) => {
    let updatedOrder: OrderRecord | null = null

    setState((current) => {
      const orderIndex = current.orders.findIndex((item) => item.orderCode === orderCode)
      if (orderIndex === -1) return current

      const order = current.orders[orderIndex]
      if (!canCustomerCancelOrder(order.status)) {
        updatedOrder = order
        return current
      }

      const paymentIndex = current.payments.findIndex(
        (item) => item.orderCode === orderCode,
      )
      const payment = paymentIndex === -1 ? null : current.payments[paymentIndex]
      const updatedAt = nowIso()
      const wasPaid =
        order.paymentStatus === 'PAID' || payment?.status === 'SUCCEEDED'
      const cancelReason = buildCancelReasonText(input)

      const nextOrder: OrderRecord = withDerivedOrderFields({
        ...order,
        status: 'CANCELLED',
        fulfillmentStatus: 'CANCELLED',
        paymentStatus: wasPaid ? 'REFUNDED' : 'UNPAID',
        updatedAt,
        cancelReason,
        timeline: [
          ...order.timeline,
          createTimelineEntry(
            'ORDER_CANCELLED',
            'Khách hàng đã hủy đơn',
            cancelReason ??
              (wasPaid
              ? 'Đơn đã hủy và khoản thanh toán sẽ được hoàn lại theo chính sách cửa hàng.'
              : 'Đơn đã hủy trước khi giao và sẽ không tiếp tục xử lý.'),
            updatedAt,
          ),
          ...(wasPaid
            ? [
                createTimelineEntry(
                  'PAYMENT_REFUNDED',
                  'Đã ghi nhận hoàn tiền',
                  'Khoản thanh toán đã được hoàn cho đơn hàng này.',
                  updatedAt,
                ),
              ]
            : []),
        ],
        timestamps: {
          ...order.timestamps,
          cancelledAt: updatedAt,
          refundedAt: wasPaid ? updatedAt : order.timestamps.refundedAt,
          updatedAt,
        },
        capabilities: buildCustomerOrderCapabilities('CANCELLED'),
      })

      const nextPayments: PaymentRecord[] =
        paymentIndex === -1
          ? current.payments
          : current.payments.map((item, index) =>
              index === paymentIndex
                ? ({
                    ...item,
                    status: wasPaid ? 'REFUNDED' : 'CANCELLED',
                    updatedAt,
                    failureReason: wasPaid
                      ? null
                      : cancelReason ?? 'Khách hàng đã hủy đơn hàng.',
                    events: [
                      ...item.events,
                      createPaymentEvent(
                        wasPaid ? 'PAYMENT_REFUNDED' : 'PAYMENT_CANCELLED',
                        wasPaid ? 'REFUNDED' : 'CANCELLED',
                        wasPaid
                          ? 'Đã hoàn tiền sau khi hủy đơn.'
                          : cancelReason ?? 'Khách hàng đã hủy đơn.',
                        updatedAt,
                      ),
                    ],
                  } satisfies PaymentRecord)
                : item,
            )

      updatedOrder = nextOrder

      return {
        ...current,
        orders: current.orders.map((item, index) =>
          index === orderIndex ? nextOrder : item,
        ),
        payments: nextPayments,
      }
    })

    return updatedOrder
  }

  const retryPayment = (orderCode: string) => {
    let updatedOrder: OrderRecord | null = null

    setState((current) => {
      const orderIndex = current.orders.findIndex((item) => item.orderCode === orderCode)
      const paymentIndex = current.payments.findIndex(
        (item) => item.orderCode === orderCode,
      )

      if (orderIndex === -1 || paymentIndex === -1) return current

      const order = current.orders[orderIndex]
      const payment = current.payments[paymentIndex]

      if (order.status === 'CANCELLED') {
        updatedOrder = order
        return current
      }

      if (payment.status === 'SUCCEEDED') {
        updatedOrder = order
        return current
      }

      const updatedAt = nowIso()
      const gatewayReference = generateGatewayReference()
      const nextPayment: PaymentRecord = {
        ...payment,
        status: 'PENDING',
        failureReason: null,
        paidAt: null,
        updatedAt,
        expiresAt: addMinutes(updatedAt, 15),
        gatewayTransactionId: generateGatewayTransactionId(),
        gatewayReference,
        qrContent: `PAYOS:${gatewayReference}:${payment.paymentCode}`,
        events: [
          ...payment.events,
          createPaymentEvent(
            'CHECKOUT_RECREATED',
            'PENDING',
            'Đã tạo lại liên kết thanh toán.',
            updatedAt,
          ),
        ],
      }
      const nextOrder: OrderRecord = withDerivedOrderFields({
        ...order,
        status: 'PENDING_PAYMENT',
        paymentStatus: 'UNPAID',
        updatedAt,
        timeline: [
          ...order.timeline,
          createTimelineEntry(
            'PAYMENT_RETRIED',
            'Đã tạo lại giao dịch',
            'Bạn có thể tiếp tục thanh toán cho đơn hàng này.',
            updatedAt,
          ),
        ],
        timestamps: {
          ...order.timestamps,
          updatedAt,
        },
        capabilities: buildCustomerOrderCapabilities('PENDING_PAYMENT'),
      })

      updatedOrder = nextOrder

      return {
        ...current,
        orders: current.orders.map((item, index) =>
          index === orderIndex ? nextOrder : item,
        ),
        payments: current.payments.map((item, index) =>
          index === paymentIndex ? nextPayment : item,
        ),
      }
    })

    return updatedOrder
  }

  const markPaymentSucceeded = (orderCode: string) => {
    let updatedOrder: OrderRecord | null = null

    setState((current) => {
      const orderIndex = current.orders.findIndex((item) => item.orderCode === orderCode)
      const paymentIndex = current.payments.findIndex(
        (item) => item.orderCode === orderCode,
      )

      if (orderIndex === -1 || paymentIndex === -1) return current

      const order = current.orders[orderIndex]
      const payment = current.payments[paymentIndex]

      if (order.status === 'CANCELLED') {
        updatedOrder = order
        return current
      }

      if (payment.status === 'SUCCEEDED') {
        updatedOrder = order
        return current
      }

      const updatedAt = nowIso()
      const nextPayment: PaymentRecord = {
        ...payment,
        status: 'SUCCEEDED',
        paidAt: updatedAt,
        updatedAt,
        failureReason: null,
        events: [
          ...payment.events,
          createPaymentEvent(
            'PAYMENT_SUCCEEDED',
            'SUCCEEDED',
            'Thanh toán đã được xác nhận.',
            updatedAt,
          ),
        ],
      }
      const nextOrder: OrderRecord = withDerivedOrderFields({
        ...order,
        status: order.status === 'PENDING_PAYMENT' ? 'PLACED' : order.status,
        paymentStatus: 'PAID',
        updatedAt,
        timeline: [
          ...order.timeline,
          createTimelineEntry(
            'PAYMENT_SUCCEEDED',
            'Thanh toán thành công',
            'Đơn hàng đã được xác nhận và đang chuẩn bị giao.',
            updatedAt,
          ),
        ],
        timestamps: {
          ...order.timestamps,
          updatedAt,
        },
        capabilities: buildCustomerOrderCapabilities(
          order.status === 'PENDING_PAYMENT' ? 'PLACED' : order.status,
        ),
      })

      updatedOrder = nextOrder

      return {
        ...current,
        orders: current.orders.map((item, index) =>
          index === orderIndex ? nextOrder : item,
        ),
        payments: current.payments.map((item, index) =>
          index === paymentIndex ? nextPayment : item,
        ),
      }
    })

    return updatedOrder
  }

  const markPaymentCancelled = (orderCode: string) =>
    cancelOrder(orderCode, {
      reasonCode: 'CHANGE_MIND',
      note: 'Khách hàng hủy khi dừng thanh toán',
    })

  const orders = useMemo(
    () =>
      [...state.orders].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [state.orders],
  )

  const payments = useMemo(
    () =>
      [...state.payments].sort(
        (left, right) =>
          new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
      ),
    [state.payments],
  )

  const value = useMemo<CommerceContextValue>(
    () => ({
      cartItems: state.cartItems,
      cartItemCount: state.cartItems.length,
      cartQuantity,
      selectedCartItemCount: selectedCartItems.length,
      selectedCartQuantity,
      selectedCartSubtotal,
      checkoutDraft: state.checkoutDraft,
      orders,
      payments,
      paymentMethods: paymentMethodOptions,
      addToCart,
      beginBuyNow,
      beginCartCheckout,
      clearCheckoutDraft,
      updateCartItemQuantity,
      toggleCartItem,
      toggleAllCartItems,
      removeCartItem,
      clearCart,
      placeOrder,
      cancelOrder,
      retryPayment,
      markPaymentSucceeded,
      markPaymentCancelled,
      getOrderByCode: (orderCode: string) =>
        orders.find((item) => item.orderCode === orderCode),
      getPaymentByOrderCode: (orderCode: string) =>
        payments.find((item) => item.orderCode === orderCode),
    }),
    [
      cartQuantity,
      orders,
      payments,
      paymentMethodOptions,
      selectedCartItems.length,
      selectedCartQuantity,
      selectedCartSubtotal,
      state.cartItems,
      state.checkoutDraft,
    ],
  )

  return (
    <CommerceContext.Provider value={value}>{children}</CommerceContext.Provider>
  )
}

export const useCommerce = () => {
  const context = useContext(CommerceContext)
  if (!context) {
    throw new Error('useCommerce must be used within CommerceProvider')
  }
  return context
}
