import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  Heading,
  HStack,
  SimpleGrid,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import {
  OrderPaymentBadge,
  OrderStatusBadge,
  PaymentTransactionBadge,
} from '../../commerce/components/status-badge'
import { useCommerce } from '../../commerce/context/commerce-context'
import {
  formatDateTime,
  formatShortDate,
  getLatestPaymentRecord,
} from '../../commerce/lib/commerce.utils'
import { formatCatalogVnd } from '../../../lib/money-vnd'
import { formatReorderError, reorderOrderToCart } from '../../commerce/lib/reorder-order'
import { commerceApi } from '../../commerce/services/commerce.api'
import type { OrderRecord, PaymentRecord } from '../../commerce/types/commerce.type'

export const OrdersPage = () => {
  const navigate = useNavigate()
  const toast = useToast()
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [reorderLoadingCode, setReorderLoadingCode] = useState<string | null>(null)
  const [remoteOrders, setRemoteOrders] = useState<OrderRecord[] | null>(null)
  const [remotePaymentsByOrder, setRemotePaymentsByOrder] = useState<Record<string, PaymentRecord[]>>({})
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const { orders, cancelOrder, getPaymentByOrderCode } = useCommerce()

  const loadRemoteOrders = async (forceServerEnabled = commerceApi.hasServerToken()) => {
    if (!forceServerEnabled) {
      setRemoteOrders(null)
      setRemotePaymentsByOrder({})
      setRemoteError('')
      return
    }

    try {
      setRemoteLoading(true)
      setRemoteError('')

      const summaryOrders = await commerceApi.listMyOrders()
      const detailedOrders = await Promise.all(
        summaryOrders.map(async (order) => {
          try {
            return await commerceApi.getOrderDetail(order.orderCode)
          } catch {
            return order
          }
        }),
      )

      const remotePayments = await Promise.all(
        detailedOrders.map(async (order) => {
          try {
            return [order.orderCode, await commerceApi.listPaymentsByOrder(order.orderCode)] as const
          } catch {
            return [order.orderCode, []] as const
          }
        }),
      )

      setRemoteOrders(detailedOrders)
      setRemotePaymentsByOrder(Object.fromEntries(remotePayments))
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Không thể tải danh sách đơn hàng.')
    } finally {
      setRemoteLoading(false)
    }
  }

  useEffect(() => {
    void loadRemoteOrders(serverEnabled)
  }, [serverEnabled])

  const usingServerData = serverEnabled && remoteOrders !== null
  const activeOrders = usingServerData ? remoteOrders : orders

  if (serverEnabled && remoteLoading && remoteOrders === null) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <Text>Đang tải đơn hàng...</Text>
      </Box>
    )
  }

  if (activeOrders.length === 0) {
    return (
      <VStack align="stretch" spacing={4}>
        {!serverEnabled ? (
          <LoginRequiredPrompt
            description="Đăng nhập để xem danh sách đơn hàng."
            onSuccess={async () => {
              setServerEnabled(true)
              await loadRemoteOrders(true)
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
            <Heading size="md">Chưa có đơn hàng nào</Heading>
            <Text color="text.secondary" maxW="560px">
              {serverEnabled
                ? 'Bạn chưa đặt đơn nào. Hãy chọn giày ưng ý và hoàn tất thanh toán.'
                : 'Sau khi đặt hàng, đơn của bạn sẽ hiển thị tại đây cùng trạng thái thanh toán và giao hàng.'}
            </Text>
            <Button as={Link} to={ROUTES.HOME} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Bắt đầu mua sắm
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" spacing={5}>
      {!serverEnabled ? (
        <LoginRequiredPrompt
          description="Đăng nhập để xem đơn hàng trên tài khoản của bạn."
          onSuccess={async () => {
            setServerEnabled(true)
            await loadRemoteOrders(true)
          }}
        />
      ) : null}

      {remoteError ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
          <Text color="red.500">{remoteError}</Text>
        </Box>
      ) : null}

      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Đơn hàng của tôi</Heading>
          <Text color="text.secondary" mt={1}>
            Theo dõi trạng thái đơn, thanh toán và giao hàng.
          </Text>
        </Box>
        <Button as={Link} to={ROUTES.CART} variant="outline" borderColor="border.muted">
          Mở giỏ hàng
        </Button>
      </HStack>

      <VStack align="stretch" spacing={4}>
        {activeOrders.map((order) => {
          const payment = usingServerData
            ? getLatestPaymentRecord(remotePaymentsByOrder[order.orderCode] ?? [])
            : getPaymentByOrderCode(order.orderCode)
          const canCancel = order.capabilities.canCancel
          const canContinuePayment =
            order.status !== 'CANCELLED' &&
            order.paymentStatus !== 'PAID' &&
            order.paymentStatus !== 'REFUNDED' &&
            payment?.status !== 'SUCCEEDED'
          const canBuyAgain = usingServerData && order.status === 'CANCELLED'

          const handleBuyAgain = async () => {
            try {
              setReorderLoadingCode(order.orderCode)
              setRemoteError('')
              const cart = await reorderOrderToCart(order.orderCode)
              toast({
                title: 'Đã thêm vào giỏ hàng',
                description: `${cart.summary.totalQuantity} sản phẩm trong giỏ`,
                status: 'success',
                duration: 2500,
                position: 'top',
              })
              navigate(ROUTES.CART)
            } catch (error) {
              const message = formatReorderError(error)
              setRemoteError(message)
              toast({ title: message, status: 'error', duration: 4000, position: 'top' })
            } finally {
              setReorderLoadingCode(null)
            }
          }

          return (
            <Box
              key={order.id}
              bg="surface.card"
              borderWidth="1px"
              borderColor="border.subtle"
              borderRadius="2xl"
              p={5}
            >
              <VStack align="stretch" spacing={4}>
                <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
                  <Box>
                    <Text fontSize="sm" color="text.secondary">
                      Order code
                    </Text>
                    <Heading size="md" mt={1}>
                      {order.orderCode}
                    </Heading>
                    <Text color="text.secondary" fontSize="sm" mt={1}>
                      Đặt lúc {formatDateTime(order.createdAt)}
                    </Text>
                  </Box>

                  <VStack align={{ base: 'start', md: 'end' }} spacing={2}>
                    <HStack spacing={2} flexWrap="wrap">
                      <OrderStatusBadge status={order.status} />
                      <OrderPaymentBadge status={order.paymentStatus} />
                      {payment ? <PaymentTransactionBadge status={payment.status} /> : null}
                    </HStack>
                    <Text fontSize="xl" fontWeight="900" color="brand.700">
                      {formatCatalogVnd(order.totalAmount)}
                    </Text>
                  </VStack>
                </HStack>

                <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                  <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={3}>
                    <Text fontSize="sm" color="text.secondary">
                      Nguoi nhan
                    </Text>
                    <Text fontWeight="800" mt={1}>
                      {order.recipientName}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      {order.recipientPhone}
                    </Text>
                  </Box>
                  <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={3}>
                    <Text fontSize="sm" color="text.secondary">
                      So mat hang
                    </Text>
                    <Text fontWeight="800" mt={1}>
                      {order.itemCount} san pham / {order.totalQuantity} item
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      Dat ngay {formatShortDate(order.createdAt)}
                    </Text>
                  </Box>
                  <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={3}>
                    <Text fontSize="sm" color="text.secondary">
                      Capability
                    </Text>
                    <Text fontWeight="800" mt={1} noOfLines={2}>
                      {canCancel ? 'Có thể hủy đơn' : 'Không thể hủy ở trạng thái hiện tại'}
                    </Text>
                    <Text fontSize="sm" color="text.secondary">
                      {order.shippingAddress.line1}, {order.shippingAddress.district}, {order.shippingAddress.province}
                    </Text>
                  </Box>
                </SimpleGrid>

                <Divider />

                <VStack align="stretch" spacing={2}>
                  {order.items.length > 0 ? (
                    order.items.slice(0, 2).map((item) => (
                      <HStack key={item.orderItemId} justify="space-between" align="start">
                        <Box>
                          <Text fontWeight="700">{item.productName}</Text>
                          <Text fontSize="sm" color="text.secondary">
                            {item.color} • {item.size} • x{item.quantity}
                          </Text>
                        </Box>
                        <Text fontWeight="800">
                          {formatCatalogVnd(item.lineTotal)}
                        </Text>
                      </HStack>
                    ))
                  ) : (
                    <Text fontSize="sm" color="text.secondary">
                      Xem chi tiết đơn để biết danh sách sản phẩm đầy đủ.
                    </Text>
                  )}
                  {order.items.length > 2 ? (
                    <Text fontSize="sm" color="text.secondary">
                      +{order.items.length - 2} sản phẩm khác
                    </Text>
                  ) : null}
                </VStack>

                <HStack justify="space-between" flexWrap="wrap" gap={3}>
                  <Text fontSize="sm" color="text.secondary">
                    Thanh toán: {order.paymentMethod}
                  </Text>
                  <HStack spacing={3}>
                    {canCancel ? (
                      <Button
                        variant="outline"
                        borderColor="red.200"
                        color="red.500"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Hủy đơn ${order.orderCode}? Đơn sẽ chuyển sang trạng thái đã hủy ngay.`,
                            )
                          ) {
                            if (usingServerData) {
                              void commerceApi
                                .cancelOrder(order.orderCode, {
                                  reasonCode: 'CHANGE_MIND',
                                  note: 'Cancelled from orders list UI',
                                })
                                .then(() => loadRemoteOrders(true))
                                .catch((error) => {
                                  setRemoteError(
                                    error instanceof Error ? error.message : 'Hủy đơn thất bại.',
                                  )
                                })
                              return
                            }

                            cancelOrder(order.orderCode, {
                              reasonCode: 'CHANGE_MIND',
                              note: 'Cancelled from orders list UI',
                            })
                          }
                        }}
                      >
                        Hủy đơn
                      </Button>
                    ) : null}
                    {canContinuePayment ? (
                      <Button
                        as={Link}
                        to={
                          usingServerData
                            ? `${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`
                            : ROUTES.PAYMENT.replace(':orderCode', order.orderCode)
                        }
                        variant="outline"
                        borderColor="border.muted"
                      >
                        Tiep tuc thanh toan
                      </Button>
                    ) : null}
                    {canBuyAgain ? (
                      <Button
                        variant="outline"
                        borderColor="brand.200"
                        color="brand.700"
                        onClick={() => void handleBuyAgain()}
                        isLoading={reorderLoadingCode === order.orderCode}
                      >
                        Mua lại
                      </Button>
                    ) : null}
                    <Button
                      as={Link}
                      to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
                      colorScheme="pink"
                      bg="brand.600"
                      _hover={{ bg: 'brand.700' }}
                      rightIcon={<ArrowForwardIcon />}
                    >
                      Xem chi tiet
                    </Button>
                  </HStack>
                </HStack>

                {order.cancelReason ? (
                  <Text fontSize="sm" color="text.secondary">
                    Cancel reason: {order.cancelReason}
                  </Text>
                ) : null}
              </VStack>
            </Box>
          )
        })}
      </VStack>
    </VStack>
  )
}
