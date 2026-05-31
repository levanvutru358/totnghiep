import { Badge } from '@chakra-ui/react'

export type OrderStatus = 'pending' | 'paid' | 'shipped' | 'cancelled'
const statusLabel: Record<OrderStatus, string> = {
  pending: 'Chờ xử lý',
  paid: 'Đã thanh toán',
  shipped: 'Đang giao',
  cancelled: 'Đã hủy',
}


const statusScheme: Record<OrderStatus, string> = {
  pending: 'yellow',
  paid: 'green',
  shipped: 'blue',
  cancelled: 'red',
}

interface StatusBadgeProps {
  status: OrderStatus
}

export const StatusBadge = ({ status }: StatusBadgeProps) => (
  <Badge colorScheme={statusScheme[status]} textTransform="capitalize">
    {statusLabel[status]}
  </Badge>
)
