import { Badge } from '@chakra-ui/react'
import { orderStatusColor, orderStatusLabel, paymentStatusLabel } from '../lib/order-labels'
import type { ServerOrderStatus, ServerPaymentStatus } from '../types/order.type'

export const OrderStatusBadge = ({ status }: { status: ServerOrderStatus }) => (
  <Badge colorScheme={orderStatusColor[status] ?? 'gray'} fontSize="xs" borderRadius="md">
    {orderStatusLabel[status] ?? status}
  </Badge>
)

export const PaymentStatusBadge = ({ status }: { status: ServerPaymentStatus }) => (
  <Badge variant="outline" colorScheme="gray" fontSize="xs" borderRadius="md">
    {paymentStatusLabel[status] ?? status}
  </Badge>
)
