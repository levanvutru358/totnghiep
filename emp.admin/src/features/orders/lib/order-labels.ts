import type {
  PlacedPaidTargetStatus,
  ServerOrderStatus,
  ServerPaymentMethod,
  ServerPaymentStatus,
} from '../types/order.type'

export const placedPaidStatusOptions: Array<{ value: PlacedPaidTargetStatus; label: string }> = [
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
]

export const getAdminStatusOptions = (
  currentStatus: ServerOrderStatus,
): Array<{ value: PlacedPaidTargetStatus; label: string }> => {
  switch (currentStatus) {
    case 'PLACED':
      return placedPaidStatusOptions
    case 'CONFIRMED':
      return placedPaidStatusOptions.filter((opt) => opt.value !== 'CONFIRMED')
    case 'PACKED':
      return placedPaidStatusOptions.filter((opt) => ['SHIPPED', 'DELIVERED'].includes(opt.value))
    case 'SHIPPED':
      return placedPaidStatusOptions.filter((opt) => opt.value === 'DELIVERED')
    case 'DELIVERED':
      return []
    default:
      return []
  }
}

export const orderStatusLabel: Record<ServerOrderStatus, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PLACED: 'Đã đặt',
  CONFIRMED: 'Đã xác nhận',
  PACKED: 'Đã đóng gói',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Đã giao',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  RETURN_REQUESTED: 'Yêu cầu trả',
  RETURNED: 'Đã trả hàng',
  REFUNDED: 'Đã hoàn tiền',
}

export const orderStatusColor: Record<ServerOrderStatus, string> = {
  PENDING_PAYMENT: 'orange',
  PLACED: 'yellow',
  CONFIRMED: 'blue',
  PACKED: 'cyan',
  SHIPPED: 'purple',
  DELIVERED: 'teal',
  COMPLETED: 'green',
  CANCELLED: 'red',
  RETURN_REQUESTED: 'pink',
  RETURNED: 'pink',
  REFUNDED: 'gray',
}

export const paymentStatusLabel: Record<ServerPaymentStatus, string> = {
  UNPAID: 'Chưa TT',
  PAID: 'Đã TT',
  PARTIALLY_REFUNDED: 'Hoàn một phần',
  REFUNDED: 'Đã hoàn',
  FAILED: 'Thất bại',
}

export const paymentMethodLabel: Record<ServerPaymentMethod, string> = {
  COD: 'COD',
  BANK_TRANSFER: 'Chuyển khoản',
  E_WALLET: 'Ví điện tử',
  CREDIT_CARD: 'Thẻ',
}

export const formatOrderMoney = (amount: number, currency = 'VND') =>
  new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
