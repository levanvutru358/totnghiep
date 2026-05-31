import { WarningTwoIcon } from '@chakra-ui/icons'
import { Box, Button, Heading, HStack, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import {
  OrderPaymentBadge,
  OrderStatusBadge,
  PaymentTransactionBadge,
} from '../../commerce/components/status-badge'
import { useCommerce } from '../../commerce/context/commerce-context'
import {
  getLatestPaymentRecord,
  resolveOrderCodeFromPaymentReturn,
} from '../../commerce/lib/commerce.utils'
import { formatCatalogVnd } from '../../../lib/money-vnd'
import { commerceApi } from '../../commerce/services/commerce.api'
import type { OrderRecord, PaymentRecord } from '../../commerce/types/commerce.type'

export const PaymentCancelPage = () => {
  const [searchParams] = useSearchParams()
  const orderCode = resolveOrderCodeFromPaymentReturn(searchParams)
  const message = searchParams.get('message')
  const returnPaymentCode = searchParams.get('paymentCode')
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [remoteOrder, setRemoteOrder] = useState<OrderRecord | null>(null)
  const [remotePayments, setRemotePayments] = useState<PaymentRecord[] | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const { getOrderByCode, getPaymentByOrderCode } = useCommerce()

  const loadRemoteCancelResult = async (forceServerEnabled = commerceApi.hasServerToken()) => {
    if (!forceServerEnabled || !orderCode) {
      setRemoteOrder(null)
      setRemotePayments(null)
      setRemoteError('')
      return
    }

    try {
      setRemoteLoading(true)
      setRemoteError('')

      if (returnPaymentCode) {
        await commerceApi.syncPayment(returnPaymentCode).catch(() => null)
      }

      const [order, payments] = await Promise.all([
        commerceApi.getOrderDetail(orderCode),
        commerceApi.listPaymentsByOrder(orderCode).catch(() => []),
      ])

      setRemoteOrder(order)
      setRemotePayments(payments)
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Không thể tải thông tin giao dịch.')
    } finally {
      setRemoteLoading(false)
    }
  }

  useEffect(() => {
    void loadRemoteCancelResult(serverEnabled)
  }, [orderCode, returnPaymentCode, serverEnabled])

  const localOrder = getOrderByCode(orderCode)
  const usingServerData = serverEnabled && remoteOrder !== null
  const order = usingServerData ? remoteOrder : localOrder
  const payment = usingServerData
    ? (remotePayments?.find((item) => item.paymentCode === returnPaymentCode) ??
      getLatestPaymentRecord(remotePayments ?? []))
    : getPaymentByOrderCode(orderCode)

  if (serverEnabled && remoteLoading && !remoteOrder) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <Text>Đang tải thông tin...</Text>
      </Box>
    )
  }

  if (!order || !payment) {
    return (
      <VStack align="stretch" spacing={4}>
        {!serverEnabled && orderCode ? (
          <LoginRequiredPrompt
            description="Đăng nhập để xem trạng thái hủy thanh toán."
            onSuccess={async () => {
              setServerEnabled(true)
              await loadRemoteCancelResult(true)
            }}
          />
        ) : null}

        {remoteError ? (
          <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
            <Text color="red.500">{remoteError}</Text>
          </Box>
        ) : null}

        <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
          <VStack spacing={4} textAlign="center">
            <Heading size="md">Không tìm thấy giao dịch</Heading>
            <Text color="text.secondary">
              Vui lòng xem lại danh sách đơn hàng hoặc đăng nhập để tra cứu giao dịch của bạn.
            </Text>
            <Button as={Link} to={ROUTES.ORDERS} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Xem danh sách đơn
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" spacing={4}>
      {remoteError ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
          <Text color="red.500">{remoteError}</Text>
        </Box>
      ) : null}

      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <VStack spacing={5} align="center" textAlign="center">
          <Box
            w="88px"
            h="88px"
            borderRadius="full"
            bg="orange.50"
            color="orange.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
            fontSize="4xl"
          >
            <WarningTwoIcon />
          </Box>

          <Box>
            <Heading size="lg">Thanh toán chưa hoàn tất</Heading>
            <Text color="text.secondary" mt={2} maxW="620px">
              Đơn hàng vẫn được giữ ở trạng thái chờ thanh toán. Bạn có thể quay lại trang thanh toán để thử lại bất cứ lúc nào.
            </Text>
          </Box>

          <HStack spacing={3} flexWrap="wrap" justify="center">
            <OrderStatusBadge status={order.status} />
            <OrderPaymentBadge status={order.paymentStatus} />
            <PaymentTransactionBadge status={payment.status} />
          </HStack>

          <Box
            w="full"
            maxW="720px"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="2xl"
            p={5}
            bg="bg.canvas"
          >
            <VStack align="stretch" spacing={3}>
              <HStack justify="space-between">
                <Text color="text.secondary">Mã đơn hàng</Text>
                <Text fontWeight="900">{order.orderCode}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Tổng thanh toán</Text>
                <Text fontWeight="900" color="brand.700">
                  {formatCatalogVnd(order.totalAmount)}
                </Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Lý do</Text>
                <Text fontWeight="700" textAlign="right" maxW="70%">
                  {message || payment.failureReason || 'Bạn đã hủy hoặc chưa hoàn tất thanh toán.'}
                </Text>
              </HStack>
            </VStack>
          </Box>

          <HStack spacing={3} flexWrap="wrap" justify="center">
            <Button
              as={Link}
              to={
                usingServerData
                  ? `${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`
                  : ROUTES.PAYMENT.replace(':orderCode', order.orderCode)
              }
              colorScheme="pink"
              bg="brand.600"
              _hover={{ bg: 'brand.700' }}
            >
              Thanh toán lại
            </Button>
            <Button
              as={Link}
              to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
              variant="outline"
              borderColor="border.muted"
            >
              Xem chi tiết đơn
            </Button>
          </HStack>
        </VStack>
      </Box>
    </VStack>
  )
}
