import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type {
  AdminOrderDetail,
  AdminOrderSummary,
  AdminReturnRequest,
  OrderCapabilities,
  OrderListFilters,
  PaginatedResult,
  ServerFulfillmentStatus,
  ServerOrderStatus,
  ServerPaymentMethod,
  ServerPaymentStatus,
} from '../types/order.type'

type ApiRecord = Record<string, unknown>

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const toString = (value: unknown) => (typeof value === 'string' ? value : value == null ? '' : String(value))

const toNullableString = (value: unknown) => {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

const mapCapabilities = (raw: ApiRecord | undefined): OrderCapabilities => ({
  canCancel: Boolean(raw?.canCancel ?? raw?.can_cancel),
  canComplete: Boolean(raw?.canComplete ?? raw?.can_complete),
  canRequestReturn: Boolean(raw?.canRequestReturn ?? raw?.can_request_return),
  canManageLifecycle: Boolean(raw?.canManageLifecycle ?? raw?.can_manage_lifecycle),
  canSetStatusFromPlaced: Boolean(raw?.canSetStatusFromPlaced ?? raw?.can_set_status_from_placed),
  canAdminUpdateOrderStatus: Boolean(
    raw?.canAdminUpdateOrderStatus ?? raw?.can_admin_update_order_status,
  ),
  canMarkPaid: Boolean(raw?.canMarkPaid ?? raw?.can_mark_paid),
  canRefund: Boolean(raw?.canRefund ?? raw?.can_refund),
  canApproveReturn: Boolean(raw?.canApproveReturn ?? raw?.can_approve_return),
})

const mapOrderSummary = (row: ApiRecord): AdminOrderSummary => ({
  id: toNumber(row.id),
  orderCode: toString(row.order_code),
  userId: toNumber(row.user_id),
  userEmail: toNullableString(row.user_email),
  userFullName: toNullableString(row.user_full_name),
  status: toString(row.status) as ServerOrderStatus,
  paymentStatus: toString(row.payment_status) as ServerPaymentStatus,
  fulfillmentStatus: toString(row.fulfillment_status) as ServerFulfillmentStatus,
  paymentMethod: toString(row.payment_method) as ServerPaymentMethod,
  recipientName: toString(row.recipient_name),
  recipientPhone: toString(row.recipient_phone),
  totalAmount: toNumber(row.total_amount),
  currencyCode: toString(row.currency_code) || 'VND',
  itemCount: toNumber(row.item_count),
  createdAt: toString(row.created_at),
  capabilities: mapCapabilities(row.capabilities as ApiRecord | undefined),
})

const mapOrderDetail = (row: ApiRecord): AdminOrderDetail => ({
  ...mapOrderSummary(row),
  recipientEmail: toNullableString(row.recipient_email),
  shippingAddressLine1: toString(row.shipping_address_line1),
  shippingAddressLine2: toNullableString(row.shipping_address_line2),
  shippingWard: toNullableString(row.shipping_ward),
  shippingDistrict: toNullableString(row.shipping_district),
  shippingProvince: toNullableString(row.shipping_province),
  shippingPostalCode: toNullableString(row.shipping_postal_code),
  shippingCountry: toNullableString(row.shipping_country),
  shippingCarrier: toNullableString(row.shipping_carrier),
  trackingNumber: toNullableString(row.tracking_number),
  note: toNullableString(row.note),
  customerNote: toNullableString(row.customer_note),
  adminNote: toNullableString(row.admin_note),
  cancelReason: toNullableString(row.cancel_reason),
  subtotal: toNumber(row.subtotal),
  discountAmount: toNumber(row.discount_amount),
  shippingFee: toNumber(row.shipping_fee),
  items: Array.isArray(row.items)
    ? row.items.map((item) => {
        const rowItem = item as ApiRecord
        return {
          id: toNumber(rowItem.id),
          productName: toString(rowItem.product_name),
          sku: toString(rowItem.sku),
          sizeLabel: toNullableString(rowItem.size_label),
          colorName: toNullableString(rowItem.color_name),
          unitPrice: toNumber(rowItem.unit_price),
          quantity: toNumber(rowItem.quantity),
          lineTotal: toNumber(rowItem.line_total),
          thumbnailUrl: toNullableString(rowItem.product_thumbnail_url),
        }
      })
    : [],
  history: Array.isArray(row.history)
    ? row.history.map((entry) => {
        const rowEntry = entry as ApiRecord
        return {
          id: toNumber(rowEntry.id),
          action: toString(rowEntry.action),
          status: toNullableString(rowEntry.status),
          paymentStatus: toNullableString(rowEntry.payment_status),
          fulfillmentStatus: toNullableString(rowEntry.fulfillment_status),
          note: toNullableString(rowEntry.note),
          actorEmail: toNullableString(rowEntry.actor_email),
          actorFullName: toNullableString(rowEntry.actor_full_name),
          createdAt: toString(rowEntry.created_at),
        }
      })
    : [],
})

const mapReturnRequest = (row: ApiRecord): AdminReturnRequest => ({
  returnId: toNumber(row.return_id),
  orderId: toNumber(row.order_id),
  orderCode: toString(row.order_code),
  userId: toNumber(row.user_id),
  userEmail: toNullableString(row.user_email),
  userFullName: toNullableString(row.user_full_name),
  orderStatus: toString(row.order_status) as ServerOrderStatus,
  paymentStatus: toString(row.payment_status) as ServerPaymentStatus,
  totalAmount: toNumber(row.total_amount),
  currencyCode: toString(row.currency_code) || 'VND',
  recipientName: toString(row.recipient_name),
  recipientPhone: toString(row.recipient_phone),
  returnReason: toNullableString(row.return_reason),
  requestedAt: toString(row.requested_at),
})

const mapPaginated = <T>(
  data: ApiRecord,
  mapItem: (row: ApiRecord) => T,
): PaginatedResult<T> => ({
  items: Array.isArray(data.items) ? data.items.map((item) => mapItem(item as ApiRecord)) : [],
  total: toNumber(data.total),
  page: toNumber(data.page, 1),
  limit: toNumber(data.limit, 10),
  totalPages: toNumber(data.totalPages, 1),
})

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise
  return response.data.data
}

const buildParams = (filters: OrderListFilters) => {
  const params: Record<string, string | number> = {}
  if (filters.page) params.page = filters.page
  if (filters.limit) params.limit = filters.limit
  if (filters.search?.trim()) params.search = filters.search.trim()
  if (filters.status) params.status = filters.status
  if (filters.paymentStatus) params.paymentStatus = filters.paymentStatus
  if (filters.fulfillmentStatus) params.fulfillmentStatus = filters.fulfillmentStatus
  if (filters.paymentMethod) params.paymentMethod = filters.paymentMethod
  if (filters.userId) params.userId = filters.userId
  return params
}

export const ordersApi = {
  list: async (filters: OrderListFilters = {}): Promise<PaginatedResult<AdminOrderSummary>> => {
    const data = await unwrap(
      http.get<ApiResponse<ApiRecord>>('/admin/orders', { params: buildParams(filters) }),
    )
    return mapPaginated(data, mapOrderSummary)
  },

  detail: async (orderId: string): Promise<AdminOrderDetail> => {
    const data = await unwrap(http.get<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}`))
    return mapOrderDetail(data)
  },

  exportCsv: async (filters: OrderListFilters = {}) => {
    const response = await http.get<Blob>('/admin/orders/export', {
      params: buildParams(filters),
      responseType: 'blob',
    })
    const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8' })
    const url = window.URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `orders-export-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    window.URL.revokeObjectURL(url)
  },

  confirm: (orderId: string, body?: { note?: string; adminNote?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/confirm`, body ?? {})),

  updateStatus: (
    orderId: string,
    body: {
      status:
        | 'CONFIRMED'
        | 'PACKED'
        | 'SHIPPED'
        | 'DELIVERED'
        | 'COMPLETED'
        | 'CANCELLED'
        | 'RETURN_REQUESTED'
      note?: string
      adminNote?: string
      reason?: string
      shippingCarrier?: string
      trackingNumber?: string
    },
  ) => unwrap(http.patch<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/status`, body)),

  cancel: (orderId: string, body?: { reason?: string; note?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/cancel`, body ?? {})),

  complete: (orderId: string, body?: { note?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/complete`, body ?? {})),

  refund: (orderId: string, body?: { note?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/refund`, body ?? {})),

  approveReturn: (orderId: string, body?: { note?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/return/approve`, body ?? {})),

  rejectReturn: (orderId: string, body?: { note?: string }) =>
    unwrap(http.post<ApiResponse<ApiRecord>>(`/admin/orders/${orderId}/return/reject`, body ?? {})),

  listReturns: async (filters: { page?: number; limit?: number; search?: string } = {}) => {
    const params: Record<string, string | number> = {}
    if (filters.page) params.page = filters.page
    if (filters.limit) params.limit = filters.limit
    if (filters.search?.trim()) params.search = filters.search.trim()
    const data = await unwrap(
      http.get<ApiResponse<ApiRecord>>('/admin/orders/returns', { params }),
    )
    return mapPaginated(data, mapReturnRequest)
  },

  returnDetail: async (returnId: number) => {
    const data = await unwrap(
      http.get<ApiResponse<ApiRecord>>(`/admin/orders/returns/${returnId}`),
    )
    return mapReturnRequest(data)
  },
}
