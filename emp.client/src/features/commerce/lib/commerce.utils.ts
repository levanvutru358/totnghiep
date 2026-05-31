import { ROUTES } from '../../../app/router/route-names'
import type {
  CancelOrderInput,
  ClientPaymentMethod,
  ClientOrderPaymentStatus,
  ClientOrderStatus,
  ClientPaymentTransactionStatus,
  OrderCapabilityFlags,
  PaymentRecord,
  PaymentMethodOption,
} from '../types/commerce.type'

type StatusMeta = {
  label: string
  colorScheme: 'gray' | 'orange' | 'green' | 'red' | 'blue' | 'purple' | 'yellow'
}

export const orderStatusMeta: Record<ClientOrderStatus, StatusMeta> = {
  PENDING_PAYMENT: { label: 'Chờ thanh toán', colorScheme: 'orange' },
  PLACED: { label: 'Đã đặt hàng', colorScheme: 'blue' },
  CONFIRMED: { label: 'Đã xác nhận', colorScheme: 'blue' },
  PACKED: { label: 'Đã đóng gói', colorScheme: 'purple' },
  SHIPPED: { label: 'Đang giao', colorScheme: 'purple' },
  DELIVERED: { label: 'Đã giao', colorScheme: 'green' },
  COMPLETED: { label: 'Hoàn tất', colorScheme: 'green' },
  CANCELLED: { label: 'Đã hủy', colorScheme: 'red' },
  RETURN_REQUESTED: { label: 'Chờ trả hàng', colorScheme: 'yellow' },
  RETURNED: { label: 'Đã trả hàng', colorScheme: 'orange' },
  REFUNDED: { label: 'Đã hoàn tiền', colorScheme: 'green' },
}

export const orderPaymentStatusMeta: Record<ClientOrderPaymentStatus, StatusMeta> = {
  UNPAID: { label: 'Chưa thanh toán', colorScheme: 'orange' },
  PAID: { label: 'Đã thanh toán', colorScheme: 'green' },
  PARTIALLY_REFUNDED: { label: 'Hoàn tiền một phần', colorScheme: 'yellow' },
  REFUNDED: { label: 'Đã hoàn tiền', colorScheme: 'green' },
  FAILED: { label: 'Thanh toán lỗi', colorScheme: 'red' },
}

export const paymentTransactionStatusMeta: Record<
  ClientPaymentTransactionStatus,
  StatusMeta
> = {
  PENDING: { label: 'Chờ giao dịch', colorScheme: 'orange' },
  PROCESSING: { label: 'Đang xử lý', colorScheme: 'blue' },
  SUCCEEDED: { label: 'Thành công', colorScheme: 'green' },
  FAILED: { label: 'Thất bại', colorScheme: 'red' },
  CANCELLED: { label: 'Đã hủy', colorScheme: 'red' },
  EXPIRED: { label: 'Hết hạn', colorScheme: 'gray' },
  REFUNDED: { label: 'Đã hoàn tiền', colorScheme: 'green' },
}

const customerCancellableStatuses: ClientOrderStatus[] = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
]

export const canCustomerCancelOrder = (status: ClientOrderStatus) =>
  customerCancellableStatuses.includes(status)

const customerCompletableStatuses: ClientOrderStatus[] = ['SHIPPED', 'DELIVERED']
const customerReturnableStatuses: ClientOrderStatus[] = ['DELIVERED', 'COMPLETED']

export const buildCustomerOrderCapabilities = (
  status: ClientOrderStatus,
): OrderCapabilityFlags => ({
  canCancel: canCustomerCancelOrder(status),
  canComplete: customerCompletableStatuses.includes(status),
  canRequestReturn: customerReturnableStatuses.includes(status),
  canManageLifecycle: false,
  canMarkPaid: false,
  canRefund: false,
  canApproveReturn: false,
})

export const paymentMethodOptions: PaymentMethodOption[] = [
  {
    code: 'E_WALLET',
    label: 'ZaloPay',
    supportsCheckout: true,
    defaultProvider: 'ZALOPAY',
    preferredPaymentMethod: [],
  },
  {
    code: 'E_WALLET',
    label: 'PayOS',
    supportsCheckout: true,
    defaultProvider: 'PAYOS',
    preferredPaymentMethod: [],
  },
]

export const pickDefaultCheckoutProvider = (
  methods: PaymentMethodOption[],
): 'ZALOPAY' | 'PAYOS' => {
  const zaloPay = methods.find(
    (method) => method.defaultProvider === 'ZALOPAY' && method.supportsCheckout,
  )
  if (zaloPay) return 'ZALOPAY'

  const payOs = methods.find(
    (method) => method.defaultProvider === 'PAYOS' && method.supportsCheckout,
  )
  if (payOs) return 'PAYOS'

  return methods[0]?.defaultProvider ?? 'ZALOPAY'
}

export const getPaymentMethodLabel = (method: ClientPaymentMethod) =>
  paymentMethodOptions.find((item) => item.code === method)?.label ?? method

export const isZaloPayPaymentMethod = (method: PaymentMethodOption): boolean =>
  method.defaultProvider === 'ZALOPAY' || method.label.toLowerCase().includes('zalopay')

export const getCheckoutPaymentDescription = (method: PaymentMethodOption): string => {
  if (isZaloPayPaymentMethod(method)) {
    return 'Thanh toán an toàn qua ví ZaloPay. Quét mã QR hoặc thanh toán trên ứng dụng ZaloPay.'
  }
  if (method.defaultProvider === 'PAYOS') {
    return 'Thanh toán an toàn qua PayOS. Hỗ trợ chuyển khoản và ví điện tử.'
  }
  return 'Thanh toán an toàn, mã hóa thông tin giao dịch.'
}

export const buildCheckoutPaymentUrls = () => {
  const origin =
    typeof window !== 'undefined' && window.location.origin
      ? window.location.origin.replace(/\/$/, '')
      : ''
  return {
    returnUrl: `${origin}${ROUTES.CHECKOUT_RESULT}`,
    cancelUrl: `${origin}${ROUTES.CHECKOUT_CANCEL}`,
  }
}

export const resolveCheckoutProvider = (
  methods: PaymentMethodOption[],
): 'ZALOPAY' | 'PAYOS' | undefined => {
  const ready = methods.find((method) => method.supportsCheckout)
  return ready?.defaultProvider
}

export const getPaymentTransactionLabel = (status: ClientPaymentTransactionStatus) =>
  paymentTransactionStatusMeta[status]?.label ?? status

export const cancelReasonOptions: Array<{
  code: string
  label: string
  helper: string
}> = [
  {
    code: 'CHANGE_MIND',
    label: 'Đổi ý',
    helper: 'Không muốn mua nữa hoặc đã tìm thấy lựa chọn khác.',
  },
  {
    code: 'WRONG_VARIANT',
    label: 'Đặt nhầm',
    helper: 'Sai màu, size hoặc số lượng.',
  },
  {
    code: 'ADDRESS_ISSUE',
    label: 'Địa chỉ',
    helper: 'Cần đổi địa chỉ hoặc không thể nhận hàng tại địa chỉ đã nhập.',
  },
]

export const returnReasonOptions: Array<{
  code: string
  label: string
  helper: string
}> = [
  {
    code: 'DAMAGED',
    label: 'Hàng lỗi',
    helper: 'Sản phẩm bị hư hỏng hoặc không đúng mô tả.',
  },
  {
    code: 'WRONG_ITEM',
    label: 'Giao sai',
    helper: 'Nhận sai màu, size hoặc mặt hàng.',
  },
  {
    code: 'NOT_AS_DESCRIBED',
    label: 'Không đúng mô tả',
    helper: 'Chất liệu, màu sắc hoặc chất lượng khác quảng cáo.',
  },
]

export const buildCancelReasonText = (input?: CancelOrderInput) => {
  if (!input) return null

  const parts = [input.reasonCode, input.reason, input.detail, input.note].filter(
    (value, index, items): value is string =>
      typeof value === 'string' && value.trim().length > 0 && items.indexOf(value) === index,
  )

  return parts.length > 0 ? parts.join(' | ') : null
}

export const buildPaymentReturnSearch = (input: {
  provider?: string
  code?: string
  paymentLinkId?: string | null
  gatewayStatus?: string
  gatewayOrderCode?: string | null
  paymentCode?: string
  paymentStatus?: ClientPaymentTransactionStatus
  orderCodeResolved?: string
  orderStatus?: ClientOrderStatus
  orderPaymentStatus?: ClientOrderPaymentStatus
  cancel?: boolean
  message?: string | null
  errorCode?: string | null
}) => {
  const params = new URLSearchParams()

  if (input.provider) params.set('provider', input.provider)
  if (input.code) params.set('code', input.code)
  if (input.paymentLinkId) params.set('id', input.paymentLinkId)
  if (input.gatewayStatus) params.set('status', input.gatewayStatus)
  if (input.gatewayOrderCode) params.set('orderCode', input.gatewayOrderCode)
  if (input.paymentCode) params.set('paymentCode', input.paymentCode)
  if (input.paymentStatus) params.set('paymentStatus', input.paymentStatus)
  if (input.orderCodeResolved) params.set('orderCodeResolved', input.orderCodeResolved)
  if (input.orderStatus) params.set('orderStatus', input.orderStatus)
  if (input.orderPaymentStatus) params.set('orderPaymentStatus', input.orderPaymentStatus)
  if (input.cancel) params.set('cancel', 'true')
  if (input.message) params.set('message', input.message)
  if (input.errorCode) params.set('errorCode', input.errorCode)

  return params.toString()
}

const isLikelyGatewayOrderCode = (value: string) => /^\d{10,}$/.test(value.trim())

export const resolveOrderCodeFromPaymentReturn = (searchParams: URLSearchParams) => {
  const resolved = searchParams.get('orderCodeResolved')?.trim()
  if (resolved) return resolved

  const orderCode = searchParams.get('orderCode')?.trim() ?? ''
  if (!orderCode || isLikelyGatewayOrderCode(orderCode)) return ''

  return orderCode
}

export const buildPaymentReturnResolveQuery = (searchParams: URLSearchParams) => {
  const params: Record<string, string> = {}
  const provider = searchParams.get('provider')?.trim()
  const paymentCode = searchParams.get('paymentCode')?.trim()
  const orderCodeResolved = searchParams.get('orderCodeResolved')?.trim()
  const appTransId = searchParams.get('app_trans_id')?.trim()
  const orderCode = searchParams.get('orderCode')?.trim()

  if (provider) params.provider = provider
  if (paymentCode) params.paymentCode = paymentCode
  if (orderCodeResolved) params.orderCodeResolved = orderCodeResolved
  if (appTransId) params.app_trans_id = appTransId
  else if (orderCode && isLikelyGatewayOrderCode(orderCode)) params.orderCode = orderCode

  return params
}

export const getLatestPaymentRecord = (payments: PaymentRecord[]) =>
  [...payments].sort(
    (left, right) =>
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime(),
  )[0] ?? null

export const formatCurrency = (value: number, currencyCode = 'USD') =>
  new Intl.NumberFormat(currencyCode === 'USD' ? 'en-US' : 'vi-VN', {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: currencyCode === 'USD' ? 2 : 0,
    maximumFractionDigits: currencyCode === 'USD' ? 2 : 0,
  }).format(value)

export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))

export const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value))
