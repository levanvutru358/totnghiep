import {
  Alert,
  AlertDescription,
  AlertIcon,
  Box,
  Button,
  Divider,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Heading,
  Image,
  Input,
  Select,
  SimpleGrid,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { OrderStatusBadge, PaymentStatusBadge } from '../components/order-status-badge'
import { useAdminOrderDetail, useOrderMutations } from '../hooks/use-orders'
import { formatOrderMoney, getAdminStatusOptions, paymentMethodLabel } from '../lib/order-labels'
import type { PlacedPaidTargetStatus, ServerOrderStatus } from '../types/order.type'

export const OrderDetailPage = () => {
  const { id: orderId } = useParams<{ id: string }>()
  const { data: order, isLoading, isError, refetch, error } = useAdminOrderDetail(orderId)
  const mutations = useOrderMutations(orderId ?? '')

  const [cancelReason, setCancelReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [placedTargetStatus, setPlacedTargetStatus] = useState<PlacedPaidTargetStatus>('CONFIRMED')
  const [statusEditorOpen, setStatusEditorOpen] = useState(false)

  const runAction = async (label: string, fn: () => Promise<unknown>) => {
    setActionError('')
    try {
      await fn()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `${label} thất bại`)
    }
  }

  useEffect(() => {
    if (!order) return
    const opts = getAdminStatusOptions(order.status)
    if (opts.length > 0) {
      setPlacedTargetStatus(opts[0].value)
    }
    const paid =
      order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED'
    const editable = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(
      order.status,
    )
    setStatusEditorOpen(paid && editable && opts.length > 0)
  }, [order?.status, order?.paymentStatus])

  const openStatusEditor = () => {
    setStatusEditorOpen(true)
    window.setTimeout(() => {
      document.getElementById('admin-status-editor')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 0)
  }

  useEffect(() => {
    if (!order) return
    if (window.location.hash !== '#admin-status-editor') return
    openStatusEditor()
  }, [order?.orderCode])

  if (!orderId) {
    return <Text>Không tìm thấy mã đơn.</Text>
  }

  if (isLoading) {
    return <Skeleton height="420px" borderRadius="xl" />
  }

  if (isError || !order) {
    return (
      <VStack align="stretch" gap={4}>
        <Button as={RouterLink} to={ROUTES.ORDERS} variant="ghost" alignSelf="flex-start" size="sm">
          ← Danh sách đơn
        </Button>
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {error instanceof Error ? error.message : 'Không tải được chi tiết đơn hàng.'}
        </Alert>
        <Button onClick={() => void refetch()}>Thử lại</Button>
      </VStack>
    )
  }

  const address = [
    order.shippingAddressLine1,
    order.shippingAddressLine2,
    order.shippingWard,
    order.shippingDistrict,
    order.shippingProvince,
  ]
    .filter(Boolean)
    .join(', ')

  const { capabilities: cap } = order
  const isPaid =
    order.paymentStatus === 'PAID' || order.paymentStatus === 'PARTIALLY_REFUNDED'
  const paidEditableStatuses: ServerOrderStatus[] = [
    'PLACED',
    'CONFIRMED',
    'PACKED',
    'SHIPPED',
    'DELIVERED',
  ]
  const statusOptions = getAdminStatusOptions(order.status)
  const showStatusEditor =
    cap.canAdminUpdateOrderStatus ||
    (isPaid && paidEditableStatuses.includes(order.status) && statusOptions.length > 0)

  const applyPlacedStatus = () => {
    void runAction('Cập nhật trạng thái', () =>
      mutations.setPlacedStatus.mutateAsync({ status: placedTargetStatus }),
    )
  }

  return (
    <VStack align="stretch" gap={5}>
      <Button as={RouterLink} to={ROUTES.ORDERS} variant="ghost" alignSelf="flex-start" size="sm">
        ← Danh sách đơn
      </Button>

      <HStack justify="space-between" flexWrap="wrap" gap={3} align="start">
        <Box>
          <Heading size="lg">{order.orderCode}</Heading>
          <Text color="text.secondary" fontSize="sm" mt={1}>
            Tạo lúc {dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
          <HStack mt={2} gap={2} flexWrap="wrap">
            <OrderStatusBadge status={order.status} />
            <PaymentStatusBadge status={order.paymentStatus} />
            <Text fontSize="sm" color="text.secondary">
              {paymentMethodLabel[order.paymentMethod]}
            </Text>
          </HStack>
        </Box>
        <VStack align={{ base: 'stretch', md: 'end' }} spacing={2}>
          <Heading size="md" color="brand.600">
            {formatOrderMoney(order.totalAmount, order.currencyCode)}
          </Heading>
          {showStatusEditor ? (
            <Button colorScheme="pink" size="sm" onClick={openStatusEditor}>
              Sửa trạng thái
            </Button>
          ) : null}
        </VStack>
      </HStack>

      {actionError ? (
        <Alert status="error" borderRadius="lg">
          <AlertIcon />
          {actionError}
        </Alert>
      ) : null}

      <Grid templateColumns={{ base: '1fr', xl: '1fr 320px' }} gap={4} alignItems="start">
        <VStack align="stretch" gap={4}>
          <SectionCard title="Khách & giao hàng">
            <SimpleGrid columns={{ base: 1, md: 2 }} gap={4} fontSize="sm">
              <Box>
                <Text color="text.secondary">Tài khoản</Text>
                <Text fontWeight="700">{order.userFullName ?? '—'}</Text>
                <Text>{order.userEmail ?? '—'}</Text>
              </Box>
              <Box>
                <Text color="text.secondary">Người nhận</Text>
                <Text fontWeight="700">{order.recipientName}</Text>
                <Text>{order.recipientPhone}</Text>
                {order.recipientEmail ? <Text>{order.recipientEmail}</Text> : null}
              </Box>
              <Box gridColumn={{ md: 'span 2' }}>
                <Text color="text.secondary">Địa chỉ</Text>
                <Text fontWeight="600">{address}</Text>
              </Box>
              {order.trackingNumber ? (
                <Box>
                  <Text color="text.secondary">Vận chuyển</Text>
                  <Text>
                    {order.shippingCarrier ?? '—'} · {order.trackingNumber}
                  </Text>
                </Box>
              ) : null}
              {order.customerNote ? (
                <Box gridColumn={{ md: 'span 2' }}>
                  <Text color="text.secondary">Ghi chú khách</Text>
                  <Text>{order.customerNote}</Text>
                </Box>
              ) : null}
            </SimpleGrid>
          </SectionCard>

          <SectionCard title="Sản phẩm">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Sản phẩm</Th>
                  <Th>SKU</Th>
                  <Th isNumeric>SL</Th>
                  <Th isNumeric>Đơn giá</Th>
                  <Th isNumeric>Thành tiền</Th>
                </Tr>
              </Thead>
              <Tbody>
                {order.items.map((item) => (
                  <Tr key={item.id}>
                    <Td>
                      <HStack>
                        {item.thumbnailUrl ? (
                          <Image src={item.thumbnailUrl} boxSize="40px" borderRadius="md" objectFit="cover" />
                        ) : null}
                        <Box>
                          <Text fontWeight="600">{item.productName}</Text>
                          <Text fontSize="xs" color="text.secondary">
                            {[item.sizeLabel, item.colorName].filter(Boolean).join(' · ')}
                          </Text>
                        </Box>
                      </HStack>
                    </Td>
                    <Td>{item.sku}</Td>
                    <Td isNumeric>{item.quantity}</Td>
                    <Td isNumeric>{formatOrderMoney(item.unitPrice, order.currencyCode)}</Td>
                    <Td isNumeric>{formatOrderMoney(item.lineTotal, order.currencyCode)}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
            <Divider my={3} />
            <SimpleGrid columns={2} gap={2} fontSize="sm" maxW="320px" ml="auto">
              <Text color="text.secondary">Tạm tính</Text>
              <Text textAlign="right">{formatOrderMoney(order.subtotal, order.currencyCode)}</Text>
              <Text color="text.secondary">Giảm giá</Text>
              <Text textAlign="right">-{formatOrderMoney(order.discountAmount, order.currencyCode)}</Text>
              <Text color="text.secondary">Phí ship</Text>
              <Text textAlign="right">{formatOrderMoney(order.shippingFee, order.currencyCode)}</Text>
              <Text fontWeight="800">Tổng</Text>
              <Text textAlign="right" fontWeight="800">
                {formatOrderMoney(order.totalAmount, order.currencyCode)}
              </Text>
            </SimpleGrid>
          </SectionCard>

          <SectionCard title="Lịch sử xử lý">
            <VStack align="stretch" spacing={3}>
              {order.history.length === 0 ? (
                <Text fontSize="sm" color="text.secondary">
                  Chưa có lịch sử.
                </Text>
              ) : (
                order.history.map((entry) => (
                  <Box key={entry.id} borderWidth="1px" borderRadius="lg" p={3} fontSize="sm">
                    <HStack justify="space-between" flexWrap="wrap">
                      <Text fontWeight="700">{entry.action}</Text>
                      <Text color="text.secondary">{dayjs(entry.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                    </HStack>
                    {entry.status ? (
                      <Text mt={1} color="text.secondary">
                        Trạng thái: {entry.status}
                      </Text>
                    ) : null}
                    {entry.note ? <Text mt={1}>{entry.note}</Text> : null}
                    {entry.actorEmail ? (
                      <Text mt={1} fontSize="xs" color="text.secondary">
                        {entry.actorFullName ?? entry.actorEmail}
                      </Text>
                    ) : null}
                  </Box>
                ))
              )}
            </VStack>
          </SectionCard>
        </VStack>

        <Box
          id="admin-status-editor"
          bg="surface.card"
          borderWidth="1px"
          borderRadius="xl"
          p={4}
          position={{ xl: 'sticky' }}
          top={4}
        >
          <HStack justify="space-between" mb={3}>
            <Heading size="sm">Thao tác</Heading>
            {showStatusEditor ? (
              <Button size="xs" variant="ghost" onClick={() => setStatusEditorOpen((open) => !open)}>
                {statusEditorOpen ? 'Thu gọn' : 'Sửa trạng thái'}
              </Button>
            ) : null}
          </HStack>
          <VStack align="stretch" spacing={2}>
            {paidEditableStatuses.includes(order.status) && !isPaid ? (
              <Text fontSize="sm" color="text.secondary">
                Chỉ cập nhật trạng thái sau khi khách thanh toán thành công (Đã TT).
              </Text>
            ) : null}

            {showStatusEditor && !statusEditorOpen ? (
              <Button colorScheme="pink" size="sm" w="full" onClick={openStatusEditor}>
                Sửa trạng thái
              </Button>
            ) : null}

            {showStatusEditor && statusEditorOpen ? (
              <>
                <Alert status="info" borderRadius="md" fontSize="sm">
                  <AlertIcon />
                  <AlertDescription>
                    Khách sẽ thấy trạng thái mới trên đơn hàng, timeline và thông báo trong tài khoản.
                  </AlertDescription>
                </Alert>
                <FormControl>
                  <FormLabel fontSize="xs">Chuyển trạng thái (đã thanh toán)</FormLabel>
                  <Select
                    size="sm"
                    value={placedTargetStatus}
                    onChange={(e) => setPlacedTargetStatus(e.target.value as PlacedPaidTargetStatus)}
                  >
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </FormControl>
                <Button
                  colorScheme="pink"
                  size="sm"
                  w="full"
                  isLoading={mutations.setPlacedStatus.isPending}
                  onClick={applyPlacedStatus}
                >
                  Lưu trạng thái
                </Button>
              </>
            ) : null}

            {!showStatusEditor && order.status === 'CONFIRMED' && cap.canManageLifecycle ? (
              <Button
                size="sm"
                variant="outline"
                isLoading={mutations.pack.isPending}
                onClick={() => void runAction('Đóng gói', () => mutations.pack.mutateAsync())}
              >
                Đánh dấu đã đóng gói
              </Button>
            ) : null}

            {!showStatusEditor && order.status === 'PACKED' && cap.canManageLifecycle ? (
              <Button
                size="sm"
                colorScheme="purple"
                isLoading={mutations.ship.isPending}
                onClick={() => void runAction('Giao hàng', () => mutations.ship.mutateAsync({}))}
              >
                Giao cho đơn vị
              </Button>
            ) : null}

            {!showStatusEditor && order.status === 'SHIPPED' && cap.canManageLifecycle ? (
              <Button
                size="sm"
                colorScheme="teal"
                isLoading={mutations.deliver.isPending}
                onClick={() => void runAction('Đã giao', () => mutations.deliver.mutateAsync())}
              >
                Đánh dấu đã giao
              </Button>
            ) : null}

            {order.status === 'DELIVERED' && cap.canComplete ? (
              <Button
                size="sm"
                colorScheme="green"
                isLoading={mutations.complete.isPending}
                onClick={() =>
                  void runAction('Hoàn tất', () =>
                    mutations.complete.mutateAsync({}),
                  )
                }
              >
                Hoàn tất đơn
              </Button>
            ) : null}

            {order.status === 'RETURN_REQUESTED' && cap.canApproveReturn ? (
              <>
                <Button
                  size="sm"
                  colorScheme="green"
                  isLoading={mutations.approveReturn.isPending}
                  onClick={() =>
                    void runAction('Duyệt trả', () =>
                      mutations.approveReturn.mutateAsync({}),
                    )
                  }
                >
                  Duyệt trả hàng
                </Button>
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  isLoading={mutations.rejectReturn.isPending}
                  onClick={() =>
                    void runAction('Từ chối trả', () =>
                      mutations.rejectReturn.mutateAsync({}),
                    )
                  }
                >
                  Từ chối trả hàng
                </Button>
              </>
            ) : null}

            {cap.canRefund ? (
              <Button
                size="sm"
                variant="outline"
                colorScheme="orange"
                isLoading={mutations.refund.isPending}
                onClick={() =>
                  void runAction('Hoàn tiền', () =>
                    mutations.refund.mutateAsync({}),
                  )
                }
              >
                Hoàn tiền (COD)
              </Button>
            ) : null}

            {cap.canCancel && !showStatusEditor ? (
              <>
                <FormControl>
                  <FormLabel fontSize="xs">Lý do hủy</FormLabel>
                  <Input size="sm" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                </FormControl>
                <Button
                  size="sm"
                  colorScheme="red"
                  variant="outline"
                  isLoading={mutations.cancel.isPending}
                  onClick={() =>
                    void runAction('Hủy đơn', () =>
                      mutations.cancel.mutateAsync({
                        reason: cancelReason || undefined,
                      }),
                    )
                  }
                >
                  Hủy đơn hàng
                </Button>
              </>
            ) : null}

            {!cap.canCancel &&
            !cap.canComplete &&
            !cap.canManageLifecycle &&
            !showStatusEditor &&
            !cap.canAdminUpdateOrderStatus &&
            !cap.canApproveReturn &&
            !cap.canRefund ? (
              <Text fontSize="sm" color="text.secondary">
                Không còn thao tác khả dụng cho trạng thái hiện tại.
              </Text>
            ) : null}
          </VStack>
        </Box>
      </Grid>

      {order.cancelReason ? (
        <Alert status="warning" borderRadius="lg">
          <AlertIcon />
          Lý do hủy: {order.cancelReason}
        </Alert>
      ) : null}
    </VStack>
  )
}
