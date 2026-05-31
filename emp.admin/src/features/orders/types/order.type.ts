export type ServerOrderStatus =
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

export type ServerPaymentStatus = 'UNPAID' | 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'FAILED'

export type ServerFulfillmentStatus =
  | 'UNFULFILLED'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'RETURNED'
  | 'CANCELLED'

export type ServerPaymentMethod = 'COD' | 'BANK_TRANSFER' | 'E_WALLET' | 'CREDIT_CARD'

export interface OrderCapabilities {
  canCancel: boolean
  canComplete: boolean
  canRequestReturn: boolean
  canManageLifecycle: boolean
  canSetStatusFromPlaced: boolean
  canAdminUpdateOrderStatus: boolean
  canMarkPaid: boolean
  canRefund: boolean
  canApproveReturn: boolean
}

/** Trạng thái admin có thể chọn khi đơn PLACED + đã thanh toán */
export type PlacedPaidTargetStatus =
  | 'CONFIRMED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'RETURN_REQUESTED'

export interface AdminOrderSummary {
  id: number
  orderCode: string
  userId: number
  userEmail: string | null
  userFullName: string | null
  status: ServerOrderStatus
  paymentStatus: ServerPaymentStatus
  fulfillmentStatus: ServerFulfillmentStatus
  paymentMethod: ServerPaymentMethod
  recipientName: string
  recipientPhone: string
  totalAmount: number
  currencyCode: string
  itemCount: number
  createdAt: string
  capabilities: OrderCapabilities
}

export interface AdminOrderItem {
  id: number
  productName: string
  sku: string
  sizeLabel: string | null
  colorName: string | null
  unitPrice: number
  quantity: number
  lineTotal: number
  thumbnailUrl: string | null
}

export interface AdminOrderHistoryEntry {
  id: number
  action: string
  status: string | null
  paymentStatus: string | null
  fulfillmentStatus: string | null
  note: string | null
  actorEmail: string | null
  actorFullName: string | null
  createdAt: string
}

export interface AdminOrderDetail extends AdminOrderSummary {
  recipientEmail: string | null
  shippingAddressLine1: string
  shippingAddressLine2: string | null
  shippingWard: string | null
  shippingDistrict: string | null
  shippingProvince: string | null
  shippingPostalCode: string | null
  shippingCountry: string | null
  shippingCarrier: string | null
  trackingNumber: string | null
  note: string | null
  customerNote: string | null
  adminNote: string | null
  cancelReason: string | null
  subtotal: number
  discountAmount: number
  shippingFee: number
  items: AdminOrderItem[]
  history: AdminOrderHistoryEntry[]
}

export interface AdminReturnRequest {
  returnId: number
  orderId: number
  orderCode: string
  userId: number
  userEmail: string | null
  userFullName: string | null
  orderStatus: ServerOrderStatus
  paymentStatus: ServerPaymentStatus
  totalAmount: number
  currencyCode: string
  recipientName: string
  recipientPhone: string
  returnReason: string | null
  requestedAt: string
}

export interface OrderListFilters {
  page?: number
  limit?: number
  search?: string
  status?: string
  paymentStatus?: string
  fulfillmentStatus?: string
  paymentMethod?: string
  userId?: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}
