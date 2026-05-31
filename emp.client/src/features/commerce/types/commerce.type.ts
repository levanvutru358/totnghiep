import type { ProductItem, ProductVariant } from '../../products/types/product.type'

export type CheckoutSource = 'cart' | 'buy_now'

export type ClientOrderStatus =
  | 'PENDING_PAYMENT'
  | 'PLACED'
  | 'CONFIRMED'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'
  | 'RETURNED'
  | 'REFUNDED'

export type ClientOrderPaymentStatus =
  | 'UNPAID'
  | 'PAID'
  | 'PARTIALLY_REFUNDED'
  | 'REFUNDED'
  | 'FAILED'

export type ClientOrderFulfillmentStatus =
  | 'UNFULFILLED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED'

export type ClientPaymentTransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCEEDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'REFUNDED'

export type ClientPaymentMethod = 'E_WALLET'

export interface ShippingAddress {
  line1: string
  line2: string | null
  ward: string | null
  district: string
  province: string
  postalCode: string | null
  country: string
}

export interface OrderCapabilityFlags {
  canCancel: boolean
  canComplete: boolean
  canRequestReturn: boolean
  canManageLifecycle: boolean
  canMarkPaid: boolean
  canRefund: boolean
  canApproveReturn: boolean
}

export interface OrderTimestamps {
  placedAt: string | null
  confirmedAt: string | null
  packedAt: string | null
  shippedAt: string | null
  deliveredAt: string | null
  completedAt: string | null
  cancelledAt: string | null
  returnRequestedAt: string | null
  returnedAt: string | null
  refundedAt: string | null
  updatedAt: string
}

export interface PaymentEventRecord {
  id: string
  eventType: string
  status: ClientPaymentTransactionStatus
  note: string | null
  createdAt: string
}

export interface PaymentMethodOption {
  code: ClientPaymentMethod
  label: string
  supportsCheckout: boolean
  defaultProvider: 'ZALOPAY' | 'PAYOS'
  preferredPaymentMethod: string[]
}

export interface CommerceProductSnapshot {
  productId: string
  productName: string
  productSlug?: string
  productCategory: string
  productBrand: string
  productImage: string
  unitPrice: number
  variantId: string
  size: string
  color: string
  sku: string
  stock: number
}

export interface CartItem extends CommerceProductSnapshot {
  cartItemId: string
  quantity: number
  selected: boolean
  addedAt: string
  updatedAt: string
}

export interface CheckoutDraft {
  id: string
  source: CheckoutSource
  items: CartItem[]
  paymentMethod: ClientPaymentMethod
  currencyCode: string
  createdAt: string
}

export interface OrderTimelineEntry {
  id: string
  type: string
  title: string
  description: string
  createdAt: string
}

export interface OrderLineItem extends CommerceProductSnapshot {
  orderItemId: string
  quantity: number
  lineTotal: number
}

export interface PaymentRecord {
  id: string
  paymentCode: string
  orderId: string
  orderCode: string
  provider: 'ZALOPAY' | 'PAYOS'
  method: ClientPaymentMethod
  status: ClientPaymentTransactionStatus
  amount: number
  currencyCode: string
  checkoutUrl: string | null
  qrContent: string | null
  deepLink: string | null
  gatewayTransactionId: string | null
  gatewayReference: string | null
  createdAt: string
  updatedAt: string
  expiresAt: string
  paidAt: string | null
  failureReason: string | null
  events: PaymentEventRecord[]
}

export interface OrderRecord {
  id: string
  orderCode: string
  source: CheckoutSource
  status: ClientOrderStatus
  paymentStatus: ClientOrderPaymentStatus
  fulfillmentStatus: ClientOrderFulfillmentStatus
  paymentMethod: ClientPaymentMethod
  paymentCode: string | null
  currencyCode: string
  createdAt: string
  updatedAt: string
  placedAt: string
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  shippingMethod: string
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  shippingWard: string | null
  shippingDistrict: string
  shippingProvince: string
  shippingPostalCode: string | null
  shippingCountry: string
  shippingAddress: ShippingAddress
  customerNote: string | null
  note: string | null
  cancelReason: string | null
  items: OrderLineItem[]
  subtotal: number
  shippingFee: number
  discountAmount: number
  totalAmount: number
  itemCount: number
  totalQuantity: number
  timeline: OrderTimelineEntry[]
  timestamps: OrderTimestamps
  capabilities: OrderCapabilityFlags
}

export interface CheckoutSubmitInput {
  recipientName: string
  recipientPhone: string
  recipientEmail: string
  shippingMethod?: string
  shippingAddress: {
    line1: string
    line2?: string
    ward?: string
    district: string
    province: string
    postalCode?: string
    country?: string
  }
  customerNote?: string
  note?: string
  shippingFee: number
  subtotal?: number
  discountAmount?: number
  voucherCode?: string
  saveAddress?: boolean
  paymentMethod: ClientPaymentMethod
  provider?: 'ZALOPAY' | 'PAYOS'
  returnUrl?: string
  cancelUrl?: string
}

export interface CancelOrderInput {
  reasonCode?: string
  reason?: string
  detail?: string
  note?: string
}

export interface RequestReturnInput {
  reasonCode?: string
  reason?: string
  detail?: string
  note?: string
}

export interface CreateOrderItemInput {
  variantId: number
  quantity: number
}

export interface CreateOrderInput extends CheckoutSubmitInput {
  items: CreateOrderItemInput[]
  source?: 'BUY_NOW' | 'ADMIN'
  currencyCode?: string
}

export interface CommerceState {
  cartItems: CartItem[]
  checkoutDraft: CheckoutDraft | null
  orders: OrderRecord[]
  payments: PaymentRecord[]
}

export interface AddToCartInput {
  product: ProductItem
  variant: ProductVariant
  quantity: number
  selected?: boolean
}
