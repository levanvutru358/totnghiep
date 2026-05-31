import { Badge } from '@chakra-ui/react'
import type {
  ClientOrderPaymentStatus,
  ClientOrderStatus,
  ClientPaymentTransactionStatus,
} from '../types/commerce.type'
import {
  orderPaymentStatusMeta,
  orderStatusMeta,
  paymentTransactionStatusMeta,
} from '../lib/commerce.utils'

const badgeStyles = {
  borderRadius: 'full',
  px: 3,
  py: 1,
  fontWeight: '800',
  textTransform: 'none' as const,
}

export const OrderStatusBadge = ({ status }: { status: ClientOrderStatus }) => {
  const meta = orderStatusMeta[status]
  return (
    <Badge colorScheme={meta.colorScheme} variant="subtle" {...badgeStyles}>
      {meta.label}
    </Badge>
  )
}

export const OrderPaymentBadge = ({
  status,
}: {
  status: ClientOrderPaymentStatus
}) => {
  const meta = orderPaymentStatusMeta[status]
  return (
    <Badge colorScheme={meta.colorScheme} variant="subtle" {...badgeStyles}>
      {meta.label}
    </Badge>
  )
}

export const PaymentTransactionBadge = ({
  status,
}: {
  status: ClientPaymentTransactionStatus
}) => {
  const meta = paymentTransactionStatusMeta[status]
  return (
    <Badge colorScheme={meta.colorScheme} variant="subtle" {...badgeStyles}>
      {meta.label}
    </Badge>
  )
}
