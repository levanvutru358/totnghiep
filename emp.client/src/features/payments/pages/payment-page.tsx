import {
  ArrowForwardIcon,
  CheckCircleIcon,
  RepeatIcon,
  TimeIcon,
  WarningTwoIcon,
} from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  Grid,
  Heading,
  HStack,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import {
  OrderPaymentBadge,
  OrderStatusBadge,
  PaymentTransactionBadge,
} from '../../commerce/components/status-badge'
import { useCommerce } from '../../commerce/context/commerce-context'
import {
  buildPaymentReturnSearch,
  formatDateTime,
  formatShortDate,
  getLatestPaymentRecord,
  getPaymentMethodLabel,
  getPaymentTransactionLabel,
} from '../../commerce/lib/commerce.utils'
import { formatCatalogVnd } from '../../../lib/money-vnd'
import { commerceApi } from '../../commerce/services/commerce.api'
import type { OrderRecord, PaymentRecord } from '../../commerce/types/commerce.type'

export const PaymentPage = () => {
  const navigate = useNavigate()
  const { orderCode = '' } = useParams()
  const [searchParams] = useSearchParams()
  const apiMode = searchParams.get('mode') === 'api'
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [remoteOrder, setRemoteOrder] = useState<OrderRecord | null>(null)
  const [remotePayments, setRemotePayments] = useState<PaymentRecord[] | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [paymentCancelling, setPaymentCancelling] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const {
    cancelOrder,
    getOrderByCode,
    getPaymentByOrderCode,
    markPaymentCancelled,
    markPaymentSucceeded,
  } = useCommerce()

  const loadRemotePaymentState = useCallback(async (forceServerEnabled = commerceApi.hasServerToken()) => {
    if (!forceServerEnabled || !orderCode) {
      setRemoteOrder(null)
      setRemotePayments(null)
      setRemoteError('')
      return
    }

    try {
      setRemoteLoading(true)
      setRemoteError('')

      const [order, payments] = await Promise.all([
        commerceApi.loadOrderDetailEnriched(orderCode),
        commerceApi.listPaymentsByOrder(orderCode).catch(() => []),
      ])

      const latest = getLatestPaymentRecord(payments)
      let enrichedPayments = payments

      if (latest?.paymentCode) {
        try {
          const detail = await commerceApi.getPaymentDetail(latest.paymentCode)
          enrichedPayments = [
            detail,
            ...payments.filter((item) => item.paymentCode !== detail.paymentCode),
          ]
        } catch {
          enrichedPayments = payments
        }
      }

      setRemoteOrder(order)
      setRemotePayments(enrichedPayments)
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Không thể tải thông tin thanh toán.')
    } finally {
      setRemoteLoading(false)
    }
  }, [orderCode])

  useEffect(() => {
    void loadRemotePaymentState(serverEnabled)
  }, [loadRemotePaymentState, serverEnabled])

  const localOrder = getOrderByCode(orderCode)
  const usingServerData = serverEnabled && remoteOrder !== null
  const order = usingServerData ? remoteOrder : localOrder
  const payment = usingServerData
    ? getLatestPaymentRecord(remotePayments ?? [])
    : getPaymentByOrderCode(orderCode)
  const isPending = payment
    ? payment.status === 'PENDING' || payment.status === 'PROCESSING'
    : false

  useEffect(() => {
    if (!usingServerData || !payment?.paymentCode || !isPending) return

    const paymentCode = payment.paymentCode
    const syncSilent = () => {
      void commerceApi
        .syncPayment(paymentCode)
        .then(() => loadRemotePaymentState(true))
        .catch(() => {
          // Auto-sync runs in the background; errors surface on the next manual refresh.
        })
    }

    syncSilent()
    const intervalId = window.setInterval(syncSilent, 5000)
    return () => window.clearInterval(intervalId)
  }, [usingServerData, payment?.paymentCode, isPending, loadRemotePaymentState])

  if ((serverEnabled || apiMode) && remoteLoading && !remoteOrder) {
    return (
      <Box
        bg="surface.card"
        borderWidth="1px"
        borderColor="border.subtle"
        borderRadius="2xl"
        p={{ base: 6, md: 10 }}
      >
        <Text>Đang tải thông tin thanh toán...</Text>
      </Box>
    )
  }

  if (!order) {
    return (
      <VStack align="stretch" spacing={4}>
        {!serverEnabled ? (
          <LoginRequiredPrompt
            description="Đăng nhập để xem và thanh toán đơn hàng."
            onSuccess={async () => {
              setServerEnabled(true)
              await loadRemotePaymentState(true)
            }}
          />
        ) : null}

        {remoteError ? (
          <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
            <Text color="red.500">{remoteError}</Text>
          </Box>
        ) : null}

        <Box
          bg="surface.card"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="2xl"
          p={{ base: 6, md: 10 }}
        >
          <VStack spacing={4} textAlign="center">
            <Heading size="md">Không tìm thấy giao dịch</Heading>
            <Text color="text.secondary">
              Giao dịch không tồn tại hoặc phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại hoặc xem danh sách đơn hàng.
            </Text>
            <Button as={Link} to={ROUTES.ORDERS} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Xem danh sách đơn
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  const isOrderCancelled = order.status === 'CANCELLED'
  const isSucceeded = payment?.status === 'SUCCEEDED'
  const canCancelOrder = order.capabilities.canCancel
  const canCreateCheckout =
    !isOrderCancelled && order.paymentStatus !== 'PAID' && order.paymentStatus !== 'REFUNDED'

  const successSearch = payment
    ? buildPaymentReturnSearch({
        provider: payment.provider,
        code: '00',
        paymentLinkId: payment.gatewayTransactionId,
        gatewayStatus: 'PAID',
        gatewayOrderCode: payment.gatewayReference,
        paymentCode: payment.paymentCode,
        paymentStatus: payment.status,
        orderCodeResolved: order.orderCode,
        orderStatus: order.status,
        orderPaymentStatus: order.paymentStatus,
      })
    : ''
  const cancelSearch = payment
    ? buildPaymentReturnSearch({
        provider: payment.provider,
        code: '01',
        paymentLinkId: payment.gatewayTransactionId,
        gatewayStatus: payment.status,
        gatewayOrderCode: payment.gatewayReference,
        paymentCode: payment.paymentCode,
        paymentStatus: payment.status,
        orderCodeResolved: order.orderCode,
        orderStatus: order.status,
        orderPaymentStatus: order.paymentStatus,
        cancel: true,
        errorCode: payment.status,
        message: payment.failureReason ?? 'Bạn đã đóng trang thanh toán PayOS.',
      })
    : ''

  const createRemoteCheckout = () => {
    if (!order) return

    setRemoteError('')

    const payload = {
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      recipientEmail: order.recipientEmail,
      shippingAddress: {
        line1: order.shippingAddress.line1,
        line2: order.shippingAddress.line2 ?? undefined,
        ward: order.shippingAddress.ward ?? undefined,
        district: order.shippingAddress.district,
        province: order.shippingAddress.province,
        postalCode: order.shippingAddress.postalCode ?? undefined,
        country: order.shippingAddress.country,
      },
    }

    const request = commerceApi.createPaymentCheckout(order.orderCode, payload)

    void request
      .then(() => loadRemotePaymentState(true))
      .catch((error) => {
        setRemoteError(error instanceof Error ? error.message : 'Không thể tạo giao dịch thanh toán mới.')
      })
  }

  const cancelRemotePayment = async () => {
    if (!payment) return

    const confirmed = window.confirm(
      `Xác nhận hủy đơn ${order.orderCode}? Đơn hàng sẽ bị hủy ngay và không được giao.`,
    )
    if (!confirmed) return

    try {
      setPaymentCancelling(true)
      setRemoteError('')

      await commerceApi.cancelPayment(payment.paymentCode, {
        cancelReason: 'Khach hang huy don hang',
        note: 'Customer cancelled order from payment page',
      })
      await loadRemotePaymentState(true)

      navigate(ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode))
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Hủy đơn hàng thất bại.')
    } finally {
      setPaymentCancelling(false)
    }
  }

  const cancelPaidOrder = async () => {
    const confirmed = window.confirm(
      `Xác nhận hủy đơn ${order.orderCode}? Đơn đã thanh toán sẽ được hủy; hoàn tiền (nếu có) theo chính sách cửa hàng.`,
    )
    if (!confirmed) return

    try {
      setPaymentCancelling(true)
      setRemoteError('')

      if (usingServerData) {
        await commerceApi.cancelOrder(order.orderCode, {
          reasonCode: 'CHANGE_MIND',
          note: 'Customer cancelled paid order from payment page',
        })
        await loadRemotePaymentState(true)
      } else {
        cancelOrder(order.orderCode, {
          reasonCode: 'CHANGE_MIND',
          note: 'Customer cancelled paid order from payment page',
        })
      }

      navigate(ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode))
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Hủy đơn hàng thất bại.')
    } finally {
      setPaymentCancelling(false)
    }
  }

  return (
    <VStack align="stretch" spacing={5}>
      {!serverEnabled ? (
        <LoginRequiredPrompt
          description="Đăng nhập để thanh toán đơn hàng trên hệ thống."
          onSuccess={async () => {
            setServerEnabled(true)
            await loadRemotePaymentState(true)
          }}
        />
      ) : null}

      {remoteError ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
          <Text color="red.500">{remoteError}</Text>
        </Box>
      ) : null}

      <HStack spacing={2} fontSize="sm" color="text.secondary" flexWrap="wrap">
        <Link to={ROUTES.ORDERS} className="hover:text-gray-900">
          Đơn hàng
        </Link>
        <Text>/</Text>
        <Link
          to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
          className="hover:text-gray-900"
        >
          {order.orderCode}
        </Link>
        <Text>/</Text>
        <Text color="text.primary" fontWeight="700">
          Thanh toán
        </Text>
      </HStack>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 360px' }} gap={5} alignItems="start">
        <VStack align="stretch" spacing={4}>
          <Box
            bg="surface.card"
            borderWidth="1px"
            borderColor="border.subtle"
            borderRadius="xl"
            p={5}
          >
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <Box>
                <Heading size="md">Thanh toán đơn {order.orderCode}</Heading>
                <Text color="text.secondary" mt={1}>
                  Hoàn tất thanh toán để xác nhận đơn hàng giày của bạn.
                </Text>
              </Box>
              <VStack align="end" spacing={2}>
                {payment ? <PaymentTransactionBadge status={payment.status} /> : null}
                <Text fontSize="sm" color="text.secondary">
                  {payment ? `Hết hạn: ${formatDateTime(payment.expiresAt)}` : 'Chưa có giao dịch'}
                </Text>
              </VStack>
            </HStack>

            <Grid templateColumns={{ base: '1fr', lg: '1.1fr 0.9fr' }} gap={4} mt={5}>
              <Box
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="2xl"
                p={5}
                bg="white"
                overflow="hidden"
              >
                <VStack align="stretch" spacing={5}>
                  <HStack justify="space-between" gap={4} flexWrap="wrap">
                    <HStack spacing={3} minW={0}>
                      <Box
                        w="48px"
                        h="48px"
                        borderRadius="xl"
                        bg="brand.50"
                        color="brand.600"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                      >
                        <CheckCircleIcon boxSize={5} />
                      </Box>
                      <Box minW={0}>
                        <Text fontWeight="900" fontSize="lg">
                          Thanh toán {payment?.provider === 'PAYOS' ? 'PayOS' : 'ZaloPay'}
                        </Text>
                        <Text fontSize="sm" color="text.secondary" noOfLines={1}>
                          Đơn {order.orderCode}
                          {payment?.paymentCode ? ` · Mã GD ${payment.paymentCode}` : ''}
                        </Text>
                      </Box>
                    </HStack>
                    {payment ? (
                      <PaymentTransactionBadge status={payment.status} />
                    ) : (
                      <Text fontSize="sm" fontWeight="800" color="text.secondary">
                        Chưa có giao dịch
                      </Text>
                    )}
                  </HStack>

                  <Box bg="gray.50" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
                    <Grid templateColumns={{ base: '1fr', md: '1.2fr 0.8fr' }} gap={4} alignItems="center">
                      <Box>
                        <Text fontSize="sm" color="text.secondary" fontWeight="700">
                          Số tiền cần thanh toán
                        </Text>
                        <Text fontWeight="900" fontSize={{ base: '3xl', md: '4xl' }} color="brand.700" mt={1}>
                          {formatCatalogVnd(order.totalAmount)}
                        </Text>
                        <Text fontSize="sm" color="text.secondary" mt={2}>
                          {payment?.checkoutUrl && isPending
                            ? `Cổng ${payment.provider === 'PAYOS' ? 'PayOS' : 'ZaloPay'} đã sẵn sàng. Mở trang thanh toán, hệ thống sẽ tự đồng bộ sau khi hoàn tất.`
                            : payment
                              ? `Giao dịch đang ở trạng thái ${getPaymentTransactionLabel(payment.status)}.`
                              : 'Chưa có giao dịch thanh toán cho đơn này.'}
                        </Text>
                      </Box>

                      <VStack align={{ base: 'stretch', md: 'end' }} spacing={2}>
                        <Text fontSize="xs" color="text.secondary" fontWeight="800" textTransform="uppercase">
                          Kênh thanh toán
                        </Text>
                        <Text fontWeight="900">{payment?.provider ?? 'ZALOPAY'}</Text>
                        <Text fontSize="sm" color="text.secondary">
                          {payment?.method ? getPaymentMethodLabel(payment.method as 'E_WALLET') : getPaymentMethodLabel(order.paymentMethod as 'E_WALLET')}
                        </Text>
                        {usingServerData && payment?.checkoutUrl && isPending ? (
                          <Button
                            size="sm"
                            colorScheme="pink"
                            bg="brand.600"
                            _hover={{ bg: 'brand.700' }}
                            onClick={() => {
                              window.open(payment.checkoutUrl ?? '', '_blank', 'noopener,noreferrer')
                            }}
                          >
                            Mở {payment.provider === 'PAYOS' ? 'PayOS' : 'ZaloPay'}
                          </Button>
                        ) : null}
                      </VStack>
                    </Grid>
                  </Box>

                  <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
                    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <HStack spacing={2} mb={1}>
                        <TimeIcon color="orange.400" />
                        <Text fontWeight="800" fontSize="sm">
                          Tạo lúc
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="text.secondary">
                        {payment ? formatShortDate(payment.createdAt) : formatShortDate(order.createdAt)}
                      </Text>
                    </Box>
                    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <HStack spacing={2} mb={1}>
                        <WarningTwoIcon color="purple.400" />
                        <Text fontWeight="800" fontSize="sm">
                          Hết hạn
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="text.secondary">
                        {payment ? formatDateTime(payment.expiresAt) : 'Chưa có hạn'}
                      </Text>
                    </Box>
                    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <HStack spacing={2} mb={1}>
                        <RepeatIcon color="blue.400" />
                        <Text fontWeight="800" fontSize="sm">
                          Cổng thanh toán
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="text.secondary">
                        PayOS
                      </Text>
                    </Box>
                    <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                      <HStack spacing={2} mb={1}>
                        <CheckCircleIcon color="green.400" />
                        <Text fontWeight="800" fontSize="sm">
                          Phương thức
                        </Text>
                      </HStack>
                      <Text fontSize="sm" color="text.secondary">
                        {payment?.method ?? order.paymentMethod}
                      </Text>
                    </Box>
                  </Grid>

                  <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between" align="start" gap={3}>
                        <Text fontWeight="900">Thông tin giao dịch</Text>
                      </HStack>
                      <HStack justify="space-between" align="start" gap={4}>
                        <Text fontSize="sm" color="text.secondary" flexShrink={0}>
                          Mã giao dịch
                        </Text>
                        <Text fontSize="sm" fontWeight="800" textAlign="right" minW={0} wordBreak="break-all">
                          {payment?.paymentCode ?? 'N/A'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" align="start" gap={4}>
                        <Text fontSize="sm" color="text.secondary" flexShrink={0}>
                          Mã cổng thanh toán
                        </Text>
                        <Text fontSize="sm" fontWeight="800" textAlign="right" minW={0} wordBreak="break-all">
                          {payment?.gatewayTransactionId ?? 'N/A'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" align="start" gap={4}>
                        <Text fontSize="sm" color="text.secondary" flexShrink={0}>
                          Mã tham chiếu
                        </Text>
                        <Text fontSize="sm" fontWeight="800" textAlign="right" minW={0} wordBreak="break-all">
                          {payment?.gatewayReference ?? 'N/A'}
                        </Text>
                      </HStack>
                      <HStack justify="space-between" align="start" gap={4}>
                        <Text fontSize="sm" color="text.secondary" flexShrink={0}>
                          Liên kết thanh toán
                        </Text>
                        <Text fontSize="sm" fontWeight="800" textAlign="right" minW={0} noOfLines={2}>
                          {payment?.checkoutUrl ?? 'N/A'}
                        </Text>
                      </HStack>
                    </VStack>
                  </Box>

                  <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4} bg="gray.50">
                    <VStack align="stretch" spacing={3}>
                      <HStack justify="space-between" align="center">
                        <Text fontWeight="900">Lịch sử cập nhật</Text>
                        <Text fontSize="xs" color="text.secondary" fontWeight="800">
                          {payment?.events.length ?? 0} mục
                        </Text>
                      </HStack>
                      {payment?.events.length ? (
                        payment.events.map((event) => (
                          <HStack
                            key={event.id}
                            justify="space-between"
                            align="start"
                            borderLeftWidth="3px"
                            borderLeftColor="brand.400"
                            pl={3}
                            gap={3}
                          >
                            <Box>
                              <Text fontWeight="700" fontSize="sm">
                                {event.eventType}
                              </Text>
                              <Text fontSize="sm" color="text.secondary">
                                {event.note ?? 'Không có ghi chú'}
                              </Text>
                            </Box>
                            <Text fontSize="xs" color="text.secondary">
                              {formatDateTime(event.createdAt)}
                            </Text>
                          </HStack>
                        ))
                      ) : (
                        <Box bg="white" borderWidth="1px" borderColor="border.subtle" borderRadius="lg" p={4}>
                          <Text fontSize="sm" color="text.secondary">
                            Chưa có cập nhật nào cho giao dịch hiện tại.
                          </Text>
                        </Box>
                      )}
                    </VStack>
                  </Box>
                </VStack>
              </Box>

              <Box
                borderWidth="1px"
                borderColor="border.subtle"
                borderRadius="2xl"
                p={5}
                bg="white"
              >
                <Heading size="sm">Trạng thái hiện tại</Heading>
                <VStack align="stretch" spacing={4} mt={4}>
                  <HStack justify="space-between" align="start">
                    <Text color="text.secondary">Trạng thái đơn</Text>
                    <OrderStatusBadge status={order.status} />
                  </HStack>
                  <HStack justify="space-between" align="start">
                    <Text color="text.secondary">Thanh toán đơn</Text>
                    <OrderPaymentBadge status={order.paymentStatus} />
                  </HStack>
                  <HStack justify="space-between" align="start">
                    <Text color="text.secondary">Giao dịch</Text>
                    {payment ? <PaymentTransactionBadge status={payment.status} /> : <Text fontWeight="700">N/A</Text>}
                  </HStack>
                  <Divider />

                  {usingServerData ? (
                    <>
                      {isOrderCancelled ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Đơn hàng đã bị hủy. Không thể thanh toán hoặc tạo lại giao dịch.
                          </Text>
                          <Button
                            as={Link}
                            to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
                            variant="outline"
                            borderColor="border.muted"
                          >
                            Xem chi tiết đơn
                          </Button>
                        </>
                      ) : null}

                      {!isOrderCancelled && !payment && canCreateCheckout ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Đơn đang chờ thanh toán. Nhấn nút bên dưới để mở cổng thanh toán.
                          </Text>
                          <Button
                            colorScheme="pink"
                            bg="brand.600"
                            _hover={{ bg: 'brand.700' }}
                            onClick={createRemoteCheckout}
                          >
                            Tạo giao dịch thanh toán
                          </Button>
                        </>
                      ) : null}

                      {!isOrderCancelled && payment && isPending ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Mở cổng thanh toán, hoàn tất trên PayOS. Hệ thống sẽ tự đồng bộ trạng thái.
                          </Text>
                          {payment.checkoutUrl ? (
                            <Button
                              colorScheme="pink"
                              bg="brand.600"
                              _hover={{ bg: 'brand.700' }}
                              onClick={() => {
                                window.open(payment.checkoutUrl ?? '', '_blank', 'noopener,noreferrer')
                              }}
                            >
                              Mở cổng thanh toán
                            </Button>
                          ) : null}
                          <Button
                            variant="outline"
                            borderColor="red.200"
                            color="red.500"
                            isLoading={paymentCancelling}
                            onClick={cancelRemotePayment}
                          >
                            Hủy đơn hàng
                          </Button>
                        </>
                      ) : null}

                      {!isOrderCancelled && payment && !isPending && !isSucceeded ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Giao dịch đang ở trạng thái {getPaymentTransactionLabel(payment.status)}.
                          </Text>
                          <Button
                            variant="outline"
                            borderColor="border.muted"
                            onClick={() => {
                              if (cancelSearch) navigate(`${ROUTES.CHECKOUT_CANCEL}?${cancelSearch}`)
                            }}
                          >
                            Xem kết quả thất bại
                          </Button>
                        </>
                      ) : null}

                      {isSucceeded ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Thanh toán thành công. Bạn có thể theo dõi đơn hoặc hủy đơn nếu chưa cần hàng.
                          </Text>
                          <Button
                            as={Link}
                            to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
                            colorScheme="pink"
                            bg="brand.600"
                            _hover={{ bg: 'brand.700' }}
                            rightIcon={<ArrowForwardIcon />}
                          >
                            Theo dõi đơn hàng
                          </Button>
                          {canCancelOrder ? (
                            <Button
                              variant="outline"
                              borderColor="red.200"
                              color="red.500"
                              isLoading={paymentCancelling}
                              onClick={() => void cancelPaidOrder()}
                            >
                              Hủy đơn hàng
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  ) : (
                    <>
                      {isOrderCancelled ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Đơn hàng này đã bị hủy. Không thể thanh toán hoặc tạo lại giao dịch.
                          </Text>
                          <Button
                            as={Link}
                            to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
                            variant="outline"
                            borderColor="border.muted"
                          >
                            Xem chi tiết đơn
                          </Button>
                        </>
                      ) : null}

                      {!isOrderCancelled && isPending && payment ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Chọn thao tác để cập nhật kết quả thanh toán.
                          </Text>
                          <Button
                            colorScheme="pink"
                            bg="brand.600"
                            _hover={{ bg: 'brand.700' }}
                            onClick={() => {
                              markPaymentSucceeded(order.orderCode)
                              navigate(`${ROUTES.CHECKOUT_RESULT}?${successSearch}`)
                            }}
                          >
                            Xác nhận thanh toán thành công
                          </Button>
                          <Button
                            variant="outline"
                            borderColor="red.200"
                            color="red.500"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Xác nhận hủy đơn ${order.orderCode}? Đơn hàng sẽ bị hủy ngay và không được giao.`,
                                )
                              ) {
                                markPaymentCancelled(order.orderCode)
                                navigate(ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode))
                              }
                            }}
                          >
                            Hủy đơn hàng
                          </Button>
                        </>
                      ) : null}

                      {!isOrderCancelled && payment && !isPending && !isSucceeded ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Giao dịch đang ở trạng thái {getPaymentTransactionLabel(payment.status)}.
                          </Text>
                        </>
                      ) : null}

                      {isSucceeded ? (
                        <>
                          <Text color="text.secondary" fontSize="sm">
                            Thanh toán thành công. Bạn có thể theo dõi đơn hoặc hủy đơn nếu chưa cần hàng.
                          </Text>
                          <Button
                            as={Link}
                            to={ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)}
                            colorScheme="pink"
                            bg="brand.600"
                            _hover={{ bg: 'brand.700' }}
                            rightIcon={<ArrowForwardIcon />}
                          >
                            Theo dõi đơn hàng
                          </Button>
                          {canCancelOrder ? (
                            <Button
                              variant="outline"
                              borderColor="red.200"
                              color="red.500"
                              onClick={() => void cancelPaidOrder()}
                            >
                              Hủy đơn hàng
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </>
                  )}
                </VStack>
              </Box>
            </Grid>
          </Box>
        </VStack>

        <Box
          bg="surface.card"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="xl"
          p={5}
          position={{ xl: 'sticky' }}
          top={{ xl: '112px' }}
        >
          <Heading size="md">Tong quan order</Heading>
          <VStack align="stretch" spacing={3} mt={4}>
            {order.items.map((item) => (
              <HStack key={item.orderItemId} justify="space-between" align="start">
                <Box>
                  <Text fontWeight="700" noOfLines={2}>
                    {item.productName}
                  </Text>
                  <Text fontSize="sm" color="text.secondary">
                    {item.color} - {item.size} - x{item.quantity}
                  </Text>
                </Box>
                <Text fontWeight="800">
                  {formatCatalogVnd(item.lineTotal)}
                </Text>
              </HStack>
            ))}
            <Divider />
            <HStack justify="space-between">
              <Text color="text.secondary">Tam tinh</Text>
              <Text fontWeight="700">
                {formatCatalogVnd(order.subtotal)}
              </Text>
            </HStack>
            <HStack justify="space-between">
              <Text color="text.secondary">Phi giao hang</Text>
              <Text fontWeight="700">
                {formatCatalogVnd(order.shippingFee)}
              </Text>
            </HStack>
            {order.discountAmount > 0 ? (
              <HStack justify="space-between">
                <Text color="text.secondary">Giam gia</Text>
                <Text fontWeight="700" color="green.600">
                  -{formatCatalogVnd(order.discountAmount)}
                </Text>
              </HStack>
            ) : null}
            <Divider />
            <HStack justify="space-between">
              <Text fontWeight="900">Tong thanh toan</Text>
              <Text fontSize="xl" fontWeight="900" color="brand.700">
                {formatCatalogVnd(order.totalAmount)}
              </Text>
            </HStack>
            <Text fontSize="sm" color="text.secondary">
              Nguoi nhan: {order.recipientName} - {order.recipientPhone}
            </Text>
          </VStack>
        </Box>
      </Grid>
    </VStack>
  )
}
