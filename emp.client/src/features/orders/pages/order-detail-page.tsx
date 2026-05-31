import { ArrowForwardIcon, CheckCircleIcon, TimeIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Image,
  Select,
  Text,
  Textarea,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import {
  OrderPaymentBadge,
  OrderStatusBadge,
  PaymentTransactionBadge,
} from '../../commerce/components/status-badge'
import { OrderProgressTracker } from '../components/order-progress-tracker'
import { useCommerce } from '../../commerce/context/commerce-context'
import {
  cancelReasonOptions,
  formatDateTime,
  getLatestPaymentRecord,
  returnReasonOptions,
} from '../../commerce/lib/commerce.utils'
import { formatCatalogVnd } from '../../../lib/money-vnd'
import { formatReorderError, reorderOrderToCart } from '../../commerce/lib/reorder-order'
import { commerceApi } from '../../commerce/services/commerce.api'
import type { OrderRecord, PaymentRecord } from '../../commerce/types/commerce.type'

export const OrderDetailPage = () => {
  const { orderCode = '' } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [remoteOrder, setRemoteOrder] = useState<OrderRecord | null>(null)
  const [remotePayments, setRemotePayments] = useState<PaymentRecord[] | null>(null)
  const [remoteLoading, setRemoteLoading] = useState(false)
  const [remoteError, setRemoteError] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const { cancelOrder, getOrderByCode, getPaymentByOrderCode } = useCommerce()
  const [cancelReasonCode, setCancelReasonCode] = useState(cancelReasonOptions[0]?.code ?? 'CHANGE_MIND')
  const [cancelReason, setCancelReason] = useState('')
  const [cancelDetail, setCancelDetail] = useState('')
  const [cancelNote, setCancelNote] = useState('')
  const [completeNote, setCompleteNote] = useState('')
  const [returnReasonCode, setReturnReasonCode] = useState(returnReasonOptions[0]?.code ?? 'DAMAGED')
  const [returnReason, setReturnReason] = useState('')
  const [returnDetail, setReturnDetail] = useState('')
  const [returnNote, setReturnNote] = useState('')

  const loadRemoteOrder = async (forceServerEnabled = commerceApi.hasServerToken()) => {
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

      setRemoteOrder(order)
      setRemotePayments(payments)
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Không thể tải chi tiết đơn hàng.')
    } finally {
      setRemoteLoading(false)
    }
  }

  useEffect(() => {
    void loadRemoteOrder(serverEnabled)
  }, [orderCode, serverEnabled])

  const localOrder = getOrderByCode(orderCode)
  const usingServerData = serverEnabled && remoteOrder !== null
  const order = usingServerData ? remoteOrder : localOrder
  const payment = usingServerData
    ? getLatestPaymentRecord(remotePayments ?? [])
    : getPaymentByOrderCode(orderCode)

  if (serverEnabled && remoteLoading && !remoteOrder) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <Text>Đang tải chi tiết đơn hàng...</Text>
      </Box>
    )
  }

  if (!order) {
    return (
      <VStack align="stretch" spacing={4}>
        {!serverEnabled ? (
          <LoginRequiredPrompt
            description="Đăng nhập để xem chi tiết đơn hàng."
            onSuccess={async () => {
              setServerEnabled(true)
              await loadRemoteOrder(true)
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
            <Heading size="md">Không tìm thấy đơn hàng</Heading>
            <Text color="text.secondary">
              Đơn hàng không tồn tại hoặc không thuộc tài khoản của bạn.
            </Text>
            <Button as={Link} to={ROUTES.ORDERS} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Quay lại danh sách đơn
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  const runRemoteAction = async (actionKey: string, action: () => Promise<unknown>) => {
    try {
      setActionLoading(actionKey)
      setRemoteError('')
      await action()
      await loadRemoteOrder(true)
    } catch (error) {
      setRemoteError(error instanceof Error ? error.message : 'Thao tac that bai.')
    } finally {
      setActionLoading(null)
    }
  }

  const canCancel = order.capabilities.canCancel
  const canComplete = order.capabilities.canComplete
  const canRequestReturn = order.capabilities.canRequestReturn
  const canContinuePayment =
    order.status !== 'CANCELLED' &&
    order.paymentStatus !== 'PAID' &&
    order.paymentStatus !== 'REFUNDED' &&
    payment?.status !== 'SUCCEEDED'
  const canBuyAgain = usingServerData && order.status === 'CANCELLED'

  const handleBuyAgain = async () => {
    try {
      setActionLoading('reorder')
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
      setActionLoading(null)
    }
  }

  const handleCancelOrder = () => {
    if (
      !window.confirm(
        `Xác nhận hủy đơn ${order.orderCode}? Sau khi hủy, đơn sẽ không được giao.`,
      )
    ) {
      return
    }

    if (usingServerData) {
      void runRemoteAction('cancel', () =>
        commerceApi.cancelOrder(order.orderCode, {
          reasonCode: cancelReasonCode,
          reason: cancelReason,
          detail: cancelDetail,
          note: cancelNote,
        }),
      )
      return
    }

    cancelOrder(order.orderCode, {
      reasonCode: cancelReasonCode,
      reason: cancelReason,
      detail: cancelDetail,
      note: cancelNote,
    })
  }

  return (
    <VStack align="stretch" spacing={5}>
      {!serverEnabled ? (
        <LoginRequiredPrompt
          description="Đăng nhập để xem chi tiết đơn hàng."
          onSuccess={async () => {
            setServerEnabled(true)
            await loadRemoteOrder(true)
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
          Orders
        </Link>
        <Text>/</Text>
        <Text color="text.primary" fontWeight="700">
          {order.orderCode}
        </Text>
      </HStack>

      <Grid templateColumns={{ base: '1fr', xl: '1fr 360px' }} gap={5} alignItems="start">
        <VStack align="stretch" spacing={4}>
          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
            <HStack justify="space-between" gap={3} flexWrap="wrap">
              <Box>
                <Heading size="lg">{order.orderCode}</Heading>
                <Text color="text.secondary" mt={1}>
                  Dat luc {formatDateTime(order.createdAt)}
                </Text>
              </Box>
              <HStack spacing={2} flexWrap="wrap">
                <OrderStatusBadge status={order.status} />
                <OrderPaymentBadge status={order.paymentStatus} />
                {payment ? <PaymentTransactionBadge status={payment.status} /> : null}
              </HStack>
            </HStack>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3} mt={5}>
              <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                <Text fontSize="sm" color="text.secondary">
                  Tong thanh toan
                </Text>
                <Text fontWeight="900" fontSize="2xl" color="brand.700" mt={1}>
                  {formatCatalogVnd(order.totalAmount)}
                </Text>
              </Box>
              <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                <Text fontSize="sm" color="text.secondary">
                  So luong
                </Text>
                <Text fontWeight="900" fontSize="2xl" mt={1}>
                  {order.totalQuantity}
                </Text>
              </Box>
              <Box borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
                <Text fontSize="sm" color="text.secondary">
                  Payment method
                </Text>
                <Text fontWeight="900" fontSize="2xl" mt={1}>
                  {order.paymentMethod}
                </Text>
              </Box>
            </Grid>

            <HStack mt={5} flexWrap="wrap" gap={2}>
              {canContinuePayment ? (
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
                  rightIcon={<ArrowForwardIcon />}
                >
                  Mở trang thanh toán
                </Button>
              ) : null}
            </HStack>

            <Box mt={5}>
              <OrderProgressTracker
                status={order.status}
                paymentStatus={order.paymentStatus}
                onBuyAgain={canBuyAgain ? () => void handleBuyAgain() : undefined}
                buyAgainLoading={actionLoading === 'reorder'}
              />
            </Box>
          </Box>

          {canCancel ? (
            <Box
              id="cancel-order-section"
              bg="surface.card"
              borderWidth="1px"
              borderColor="red.100"
              borderRadius="2xl"
              p={5}
            >
              <Heading size="md">Hủy đơn hàng</Heading>
              <Text color="text.secondary" mt={2}>
                Đơn sẽ được hủy ngay sau khi xác nhận. Vui lòng chọn lý do hủy bên dưới.
              </Text>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mt={4}>
                <FormControl>
                  <FormLabel>Lý do hủy</FormLabel>
                  <Select value={cancelReasonCode} onChange={(event) => setCancelReasonCode(event.target.value)}>
                    {cancelReasonOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </Select>
                  <Text fontSize="sm" color="text.secondary" mt={1}>
                    {cancelReasonOptions.find((option) => option.code === cancelReasonCode)?.helper}
                  </Text>
                </FormControl>
                <FormControl>
                  <FormLabel>Mô tả ngắn</FormLabel>
                  <Textarea
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value)}
                    rows={3}
                    placeholder="Không muốn mua nữa"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Chi tiết</FormLabel>
                  <Textarea
                    value={cancelDetail}
                    onChange={(event) => setCancelDetail(event.target.value)}
                    rows={3}
                    placeholder="Đặt nhầm màu hoặc size"
                  />
                </FormControl>
                <FormControl>
                  <FormLabel>Ghi chú thêm</FormLabel>
                  <Textarea
                    value={cancelNote}
                    onChange={(event) => setCancelNote(event.target.value)}
                    rows={3}
                    placeholder="Cần hỗ trợ hủy sớm"
                  />
                </FormControl>
              </Grid>
              <Button
                mt={4}
                variant="outline"
                borderColor="red.200"
                color="red.500"
                onClick={handleCancelOrder}
                isLoading={actionLoading === 'cancel'}
              >
                Hủy đơn hàng
              </Button>
            </Box>
          ) : null}

          {usingServerData && canComplete ? (
            <Box bg="surface.card" borderWidth="1px" borderColor="green.100" borderRadius="2xl" p={5}>
              <Heading size="md">Xác nhận đã nhận hàng</Heading>
              <Text color="text.secondary" mt={2} fontSize="sm">
                Xác nhận khi bạn đã nhận đủ sản phẩm và hài lòng với đơn hàng.
              </Text>
              <FormControl mt={4}>
                <FormLabel>Ghi chu</FormLabel>
                <Textarea
                  value={completeNote}
                  onChange={(event) => setCompleteNote(event.target.value)}
                  rows={2}
                  placeholder="Da nhan hang day du"
                />
              </FormControl>
              <Button
                mt={4}
                colorScheme="green"
                onClick={() =>
                  void runRemoteAction('complete', () =>
                    commerceApi.completeOrder(order.orderCode, completeNote.trim() || undefined),
                  )
                }
                isLoading={actionLoading === 'complete'}
              >
                Xác nhận hoàn tất
              </Button>
            </Box>
          ) : null}

          {usingServerData && canRequestReturn ? (
            <Box bg="surface.card" borderWidth="1px" borderColor="orange.100" borderRadius="2xl" p={5}>
              <Heading size="md">Yêu cầu trả hàng</Heading>
              <Text color="text.secondary" mt={2} fontSize="sm">
                Điền thông tin bên dưới nếu bạn muốn trả hoặc đổi sản phẩm.
              </Text>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4} mt={4}>
                <FormControl>
                  <FormLabel>reasonCode</FormLabel>
                  <Select value={returnReasonCode} onChange={(event) => setReturnReasonCode(event.target.value)}>
                    {returnReasonOptions.map((option) => (
                      <option key={option.code} value={option.code}>
                        {option.code} - {option.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <FormControl>
                  <FormLabel>reason</FormLabel>
                  <Textarea value={returnReason} onChange={(event) => setReturnReason(event.target.value)} rows={3} />
                </FormControl>
                <FormControl>
                  <FormLabel>detail</FormLabel>
                  <Textarea value={returnDetail} onChange={(event) => setReturnDetail(event.target.value)} rows={3} />
                </FormControl>
                <FormControl>
                  <FormLabel>note</FormLabel>
                  <Textarea value={returnNote} onChange={(event) => setReturnNote(event.target.value)} rows={3} />
                </FormControl>
              </Grid>
              <Button
                mt={4}
                colorScheme="orange"
                onClick={() =>
                  void runRemoteAction('return', () =>
                    commerceApi.requestOrderReturn(order.orderCode, {
                      reasonCode: returnReasonCode,
                      reason: returnReason,
                      detail: returnDetail,
                      note: returnNote,
                    }),
                  )
                }
                isLoading={actionLoading === 'return'}
              >
                Gửi yêu cầu trả hàng
              </Button>
            </Box>
          ) : null}

          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
            <Heading size="md" mb={4}>
              San pham trong order
            </Heading>
            <VStack align="stretch" spacing={4}>
              {order.items.map((item) => (
                <Box key={item.orderItemId}>
                  <Grid templateColumns={{ base: '1fr', md: '84px 1fr auto' }} gap={4} alignItems="center">
                    <Image
                      src={item.productImage}
                      alt={item.productName}
                      boxSize="84px"
                      objectFit="cover"
                      borderRadius="lg"
                    />
                    <Box>
                      <Text fontWeight="800">{item.productName}</Text>
                      <Text fontSize="sm" color="text.secondary">
                        {item.productBrand} • {item.productCategory}
                      </Text>
                      <Text fontSize="sm" color="text.secondary">
                        {item.color} • {item.size} • SKU {item.sku}
                      </Text>
                    </Box>
                    <VStack align={{ base: 'stretch', md: 'end' }} spacing={1}>
                      <Text fontWeight="700">x{item.quantity}</Text>
                      <Text fontWeight="900" color="brand.700">
                        {formatCatalogVnd(item.lineTotal)}
                      </Text>
                    </VStack>
                  </Grid>
                  <Divider mt={4} />
                </Box>
              ))}
            </VStack>
          </Box>

          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
            <Heading size="md" mb={4}>
              Timeline
            </Heading>
            <VStack align="stretch" spacing={4}>
              {order.timeline.map((entry, index) => (
                <HStack key={entry.id} align="start" spacing={4}>
                  <VStack spacing={0}>
                    <Box
                      w="34px"
                      h="34px"
                      borderRadius="full"
                      bg={index === order.timeline.length - 1 ? 'brand.50' : 'bg.canvas'}
                      color={index === order.timeline.length - 1 ? 'brand.600' : 'text.secondary'}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                    >
                      {index === order.timeline.length - 1 ? <CheckCircleIcon /> : <TimeIcon />}
                    </Box>
                    {index !== order.timeline.length - 1 ? (
                      <Box w="2px" flex="1" minH="44px" bg="border.subtle" />
                    ) : null}
                  </VStack>
                  <Box pb={index === order.timeline.length - 1 ? 0 : 2}>
                    <Text fontWeight="800">{entry.title}</Text>
                    <Text color="text.secondary" fontSize="sm" mt={1}>
                      {entry.description}
                    </Text>
                    <Text color="text.secondary" fontSize="xs" mt={1}>
                      {formatDateTime(entry.createdAt)}
                    </Text>
                  </Box>
                </HStack>
              ))}
            </VStack>
          </Box>
        </VStack>

        <VStack align="stretch" spacing={4}>
          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
            <Heading size="md">Thông tin giao hàng</Heading>
            <VStack align="stretch" spacing={3} mt={4}>
              <Box>
                <Text fontSize="sm" color="text.secondary">
                  Nguoi nhan
                </Text>
                <Text fontWeight="800" mt={1}>
                  {order.recipientName}
                </Text>
                <Text color="text.secondary">{order.recipientPhone}</Text>
                <Text color="text.secondary">{order.recipientEmail}</Text>
              </Box>
              <Divider />
              <Box>
                <Text fontSize="sm" color="text.secondary">
                  Dia chi
                </Text>
                <Text fontWeight="800" mt={1}>
                  {order.shippingAddressLine1}
                </Text>
                {order.shippingAddressLine2 ? (
                  <Text color="text.secondary">{order.shippingAddressLine2}</Text>
                ) : null}
                <Text color="text.secondary">
                  {order.shippingWard ? `${order.shippingWard}, ` : ''}
                  {order.shippingDistrict}, {order.shippingProvince}
                </Text>
              </Box>
              {order.customerNote ? (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="sm" color="text.secondary">
                      Ghi chu
                    </Text>
                    <Text fontWeight="700" mt={1}>
                      {order.customerNote}
                    </Text>
                  </Box>
                </>
              ) : null}
              {order.cancelReason ? (
                <>
                  <Divider />
                  <Box>
                    <Text fontSize="sm" color="text.secondary">
                      Cancel reason
                    </Text>
                    <Text fontWeight="700" mt={1}>
                      {order.cancelReason}
                    </Text>
                  </Box>
                </>
              ) : null}
            </VStack>
          </Box>

          <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={5}>
            <Heading size="md">Thanh toán</Heading>
            <VStack align="stretch" spacing={3} mt={4}>
              <HStack justify="space-between">
                <Text color="text.secondary">Tạm tính</Text>
                <Text fontWeight="700">{formatCatalogVnd(order.subtotal)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Phí giao hàng</Text>
                <Text fontWeight="700">{formatCatalogVnd(order.shippingFee)}</Text>
              </HStack>
              <HStack justify="space-between">
                <Text color="text.secondary">Giảm giá</Text>
                <Text fontWeight="700">{formatCatalogVnd(order.discountAmount)}</Text>
              </HStack>
              <Divider />
              <HStack justify="space-between">
                <Text fontWeight="900">Tổng cộng</Text>
                <Text fontSize="xl" fontWeight="900" color="brand.700">
                  {formatCatalogVnd(order.totalAmount)}
                </Text>
              </HStack>
              {payment ? (
                <>
                  <Divider />
                  <HStack justify="space-between" align="start">
                    <Text color="text.secondary">Mã giao dịch</Text>
                    <Text fontWeight="700" fontSize="sm" textAlign="right">
                      {payment.paymentCode}
                    </Text>
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="text.secondary">Trạng thái</Text>
                    <PaymentTransactionBadge status={payment.status} />
                  </HStack>
                  <HStack justify="space-between">
                    <Text color="text.secondary">Cổng thanh toán</Text>
                    <Text fontWeight="700">
                      {payment.provider === 'PAYOS' ? 'PayOS' : payment.provider === 'ZALOPAY' ? 'ZaloPay' : payment.provider}
                    </Text>
                  </HStack>
                  <HStack spacing={2} flexWrap="wrap" pt={1}>
                    {canContinuePayment ? (
                      <Button
                        as={Link}
                        to={`${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`}
                        size="sm"
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                      >
                        Thanh toán
                      </Button>
                    ) : null}
                    {canCancel ? (
                      <Button
                        size="sm"
                        variant="outline"
                        borderColor="red.200"
                        color="red.500"
                        onClick={handleCancelOrder}
                        isLoading={actionLoading === 'cancel'}
                      >
                        Hủy đơn hàng
                      </Button>
                    ) : null}
                    {canBuyAgain ? (
                      <Button
                        size="sm"
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                        onClick={() => void handleBuyAgain()}
                        isLoading={actionLoading === 'reorder'}
                      >
                        Mua lại
                      </Button>
                    ) : null}
                  </HStack>
                </>
              ) : (
                <>
                  <Divider />
                  <Text fontSize="sm" color="text.secondary">
                    Chưa có giao dịch thanh toán cho đơn này.
                  </Text>
                  {canContinuePayment ? (
                    <Button
                      as={Link}
                      to={`${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`}
                      size="sm"
                      colorScheme="pink"
                      bg="brand.600"
                      _hover={{ bg: 'brand.700' }}
                    >
                      Thanh toán
                    </Button>
                  ) : null}
                </>
              )}
            </VStack>
          </Box>
        </VStack>
      </Grid>
    </VStack>
  )
}
