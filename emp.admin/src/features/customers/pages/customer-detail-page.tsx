import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  Heading,
  HStack,
  Input,
  Link,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  NumberInput,
  NumberInputField,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  Tabs,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  VStack,
  useDisclosure,
} from '@chakra-ui/react'
import dayjs from 'dayjs'
import { useEffect, useState } from 'react'
import { Link as RouterLink, useParams } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import { ROUTES } from '../../../app/router/route-names'
import { useAuthStore } from '../../../app/store/app.store'
import { OrderStatusBadge, PaymentStatusBadge } from '../../orders/components/order-status-badge'
import { formatOrderMoney } from '../../orders/lib/order-labels'
import { accountStatusColor, accountStatusLabel } from '../lib/customer-labels'
import { useAdminCustomerDetail, useCustomerMutations } from '../hooks/use-customers'
import type { AccountStatus } from '../types/customer.type'

const formatAddress = (row: {
  recipientName: string
  recipientPhone: string
  line1: string
  line2: string | null
  ward: string | null
  district: string
  province: string
}) => {
  const parts = [row.line1, row.line2, row.ward, row.district, row.province].filter(Boolean)
  return `${row.recipientName} · ${row.recipientPhone} — ${parts.join(', ')}`
}

export const CustomerDetailPage = () => {
  const { id } = useParams<{ id: string }>()
  const customerId = Number(id)
  const { hasPermission } = useAuthStore()
  const canManage = hasPermission('customers.manage')

  const { data: customer, isLoading, isError, refetch } = useAdminCustomerDetail(
    Number.isFinite(customerId) ? customerId : undefined,
  )
  const { update, lock, tempLock, unlock } = useCustomerMutations(customerId)

  const lockModal = useDisclosure()
  const tempLockModal = useDisclosure()

  const [fullName, setFullName] = useState('')
  const [lockReason, setLockReason] = useState('')
  const [tempLockReason, setTempLockReason] = useState('')
  const [tempLockHours, setTempLockHours] = useState(24)

  useEffect(() => {
    if (customer) setFullName(customer.fullName ?? '')
  }, [customer])

  if (isLoading) {
    return (
      <VStack align="stretch" gap={4}>
        <Skeleton height="32px" />
        <Skeleton height="320px" />
      </VStack>
    )
  }

  if (isError || !customer) {
    return (
      <VStack align="start" gap={3}>
        <Text color="red.500">Không tải được thông tin khách hàng.</Text>
        <Button size="sm" onClick={() => void refetch()}>
          Thử lại
        </Button>
        <Link as={RouterLink} to={ROUTES.CUSTOMERS} color="brand.600" fontSize="sm">
          ← Danh sách khách hàng
        </Link>
      </VStack>
    )
  }

  const status = customer.accountStatus as AccountStatus
  const isLocked = status !== 'ACTIVE'

  const runLock = async () => {
    try {
      await lock.mutateAsync({ reason: lockReason.trim() })
      toast.success('Đã khóa tài khoản')
      lockModal.onClose()
      setLockReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Khóa thất bại')
    }
  }

  const runTempLock = async () => {
    try {
      await tempLock.mutateAsync({ reason: tempLockReason.trim(), durationHours: tempLockHours })
      toast.success('Đã tạm khóa tài khoản')
      tempLockModal.onClose()
      setTempLockReason('')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Tạm khóa thất bại')
    }
  }

  const runUnlock = async () => {
    if (!window.confirm('Mở khóa tài khoản này?')) return
    try {
      await unlock.mutateAsync()
      toast.success('Đã mở khóa tài khoản')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Mở khóa thất bại')
    }
  }

  const saveProfile = async () => {
    try {
      await update.mutateAsync({ fullName: fullName.trim() || null })
      toast.success('Đã cập nhật họ tên')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Cập nhật thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Link as={RouterLink} to={ROUTES.CUSTOMERS} fontSize="sm" color="text.secondary">
          ← Danh sách khách hàng
        </Link>
        <HStack mt={2} justify="space-between" flexWrap="wrap" gap={3}>
          <Box>
            <Heading size="lg">{customer.fullName || customer.email}</Heading>
            <HStack mt={1} gap={2}>
              <Badge colorScheme={accountStatusColor[status]}>{accountStatusLabel[status]}</Badge>
              <Text fontSize="sm" color="text.secondary">
                ID #{customer.id} · {customer.email}
              </Text>
            </HStack>
          </Box>
          {canManage && (
            <HStack flexWrap="wrap">
              {isLocked ? (
                <Button size="sm" colorScheme="green" isLoading={unlock.isPending} onClick={() => void runUnlock()}>
                  Mở khóa
                </Button>
              ) : (
                <>
                  <Button size="sm" colorScheme="orange" variant="outline" onClick={tempLockModal.onOpen}>
                    Tạm khóa
                  </Button>
                  <Button size="sm" colorScheme="red" onClick={lockModal.onOpen}>
                    Khóa vĩnh viễn
                  </Button>
                </>
              )}
            </HStack>
          )}
        </HStack>
      </Box>

      {isLocked && customer.lockReason && (
        <Alert status="warning" borderRadius="md">
          <AlertIcon />
          <AlertDescription fontSize="sm">
            <Text fontWeight="700">Lý do khóa:</Text> {customer.lockReason}
            {customer.lockedUntil && status === 'TEMP_LOCKED' && (
              <Text mt={1}>
                Hết hạn tạm khóa: {dayjs(customer.lockedUntil).format('DD/MM/YYYY HH:mm')}
              </Text>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
          <Text fontSize="xs" color="text.secondary">
            Số đơn hàng
          </Text>
          <Text fontSize="2xl" fontWeight="800">
            {customer.orderCount}
          </Text>
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
          <Text fontSize="xs" color="text.secondary">
            Tổng chi tiêu
          </Text>
          <Text fontSize="2xl" fontWeight="800">
            {formatOrderMoney(customer.totalSpent)}
          </Text>
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
          <Text fontSize="xs" color="text.secondary">
            Đăng ký
          </Text>
          <Text fontSize="md" fontWeight="700">
            {dayjs(customer.createdAt).format('DD/MM/YYYY HH:mm')}
          </Text>
        </Box>
      </Grid>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
        <Tabs variant="enclosed" colorScheme="pink">
          <TabList flexWrap="wrap">
            <Tab>Thông tin cá nhân</Tab>
            <Tab>Địa chỉ ({customer.addresses.length})</Tab>
            <Tab>Đơn hàng ({customer.recentOrders.length})</Tab>
            <Tab>Lịch sử đăng nhập</Tab>
            <Tab>Thiết bị ({customer.devices.length})</Tab>
            <Tab>Đánh giá ({customer.reviews.length})</Tab>
            <Tab>Bình luận ({customer.comments.length})</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4}>
                <Box>
                  <Text fontSize="xs" color="text.secondary">
                    Email
                  </Text>
                  <Text fontWeight="600">{customer.email}</Text>
                </Box>
                <Box>
                  <Text fontSize="xs" color="text.secondary">
                    Cập nhật lần cuối
                  </Text>
                  <Text>{dayjs(customer.updatedAt).format('DD/MM/YYYY HH:mm')}</Text>
                </Box>
              </Grid>
              {canManage && (
                <FormControl mt={4} maxW="md">
                  <FormLabel fontSize="sm">Họ tên</FormLabel>
                  <HStack>
                    <Input size="sm" value={fullName} onChange={(e) => setFullName(e.target.value)} />
                    <Button size="sm" colorScheme="pink" isLoading={update.isPending} onClick={() => void saveProfile()}>
                      Lưu
                    </Button>
                  </HStack>
                </FormControl>
              )}
            </TabPanel>

            <TabPanel px={0}>
              {customer.addresses.length === 0 ? (
                <Text fontSize="sm" color="text.secondary">
                  Chưa có địa chỉ từ đơn hàng.
                </Text>
              ) : (
                <VStack align="stretch" spacing={2}>
                  {customer.addresses.map((addr, index) => (
                    <Box key={index} borderWidth="1px" borderRadius="md" p={3} fontSize="sm">
                      <Text>{formatAddress(addr)}</Text>
                      <Text fontSize="xs" color="text.secondary" mt={1}>
                        Dùng {addr.usedCount} lần · Gần nhất {dayjs(addr.lastUsedAt).format('DD/MM/YYYY')}
                      </Text>
                    </Box>
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel px={0}>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Mã đơn</Th>
                    <Th>Trạng thái</Th>
                    <Th>Thanh toán</Th>
                    <Th>Tổng</Th>
                    <Th>Ngày</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {customer.recentOrders.map((order) => (
                    <Tr key={order.id}>
                      <Td>
                        <Link
                          as={RouterLink}
                          to={ROUTES.ORDER_DETAIL.replace(':id', order.orderCode)}
                          fontWeight="700"
                          color="brand.600"
                        >
                          {order.orderCode}
                        </Link>
                      </Td>
                      <Td>
                        <OrderStatusBadge status={order.status as never} />
                      </Td>
                      <Td>
                        <PaymentStatusBadge status={order.paymentStatus as never} />
                      </Td>
                      <Td>{formatOrderMoney(order.totalAmount, order.currencyCode)}</Td>
                      <Td fontSize="xs">{dayjs(order.createdAt).format('DD/MM/YYYY HH:mm')}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel px={0}>
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Thời gian</Th>
                    <Th>Thiết bị</Th>
                    <Th>IP</Th>
                    <Th>Kết quả</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {customer.loginLogs.map((log) => (
                    <Tr key={log.id}>
                      <Td fontSize="xs" whiteSpace="nowrap">
                        {dayjs(log.createdAt).format('DD/MM/YYYY HH:mm')}
                      </Td>
                      <Td>{log.deviceLabel ?? '—'}</Td>
                      <Td>{log.ipAddress ?? '—'}</Td>
                      <Td>
                        <Badge colorScheme={log.isSuccess ? 'green' : 'red'}>
                          {log.isSuccess ? 'Thành công' : log.failureReason ?? 'Thất bại'}
                        </Badge>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </TabPanel>

            <TabPanel px={0}>
              {customer.devices.length === 0 ? (
                <Text fontSize="sm" color="text.secondary">
                  Không có phiên đăng nhập đang hoạt động.
                </Text>
              ) : (
                <Table size="sm">
                  <Thead>
                    <Tr>
                      <Th>Thiết bị</Th>
                      <Th>IP</Th>
                      <Th>Phiên đến</Th>
                      <Th>Đăng nhập lúc</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {customer.devices.map((device) => (
                      <Tr key={device.id}>
                        <Td>{device.deviceLabel ?? 'Không rõ'}</Td>
                        <Td>{device.ipAddress ?? '—'}</Td>
                        <Td fontSize="xs">{dayjs(device.expiresAt).format('DD/MM/YYYY HH:mm')}</Td>
                        <Td fontSize="xs">{dayjs(device.createdAt).format('DD/MM/YYYY HH:mm')}</Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </TabPanel>

            <TabPanel px={0}>
              {customer.reviews.map((review) => (
                <Box key={review.id} borderWidth="1px" borderRadius="md" p={3} mb={2} fontSize="sm">
                  <HStack justify="space-between">
                    <Text fontWeight="700">{review.productName}</Text>
                    <Badge>{review.rating} sao</Badge>
                  </HStack>
                  {review.title && <Text fontWeight="600">{review.title}</Text>}
                  <Text mt={1}>{review.content}</Text>
                  <Text fontSize="xs" color="text.secondary" mt={1}>
                    {dayjs(review.createdAt).format('DD/MM/YYYY HH:mm')} · {review.status}
                  </Text>
                </Box>
              ))}
            </TabPanel>

            <TabPanel px={0}>
              {customer.comments.map((comment) => (
                <Box key={comment.id} borderWidth="1px" borderRadius="md" p={3} mb={2} fontSize="sm">
                  <Text fontWeight="700">{comment.productName}</Text>
                  <Text mt={1}>{comment.content}</Text>
                  <Text fontSize="xs" color="text.secondary" mt={1}>
                    {dayjs(comment.createdAt).format('DD/MM/YYYY HH:mm')}
                    {comment.parentId ? ` · Trả lời #${comment.parentId}` : ''}
                  </Text>
                </Box>
              ))}
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      <Modal isOpen={lockModal.isOpen} onClose={lockModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Khóa tài khoản vĩnh viễn</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Lý do khóa (hiển thị cho khách)</FormLabel>
              <Textarea value={lockReason} onChange={(e) => setLockReason(e.target.value)} rows={4} />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={lockModal.onClose}>
              Hủy
            </Button>
            <Button colorScheme="red" isLoading={lock.isPending} onClick={() => void runLock()}>
              Khóa tài khoản
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={tempLockModal.isOpen} onClose={tempLockModal.onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Tạm khóa tài khoản</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack align="stretch" spacing={4}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Lý do tạm khóa</FormLabel>
                <Textarea value={tempLockReason} onChange={(e) => setTempLockReason(e.target.value)} rows={3} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Thời gian (giờ)</FormLabel>
                <NumberInput min={1} max={24 * 365} value={tempLockHours} onChange={(_, n) => setTempLockHours(n || 1)}>
                  <NumberInputField />
                </NumberInput>
              </FormControl>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={2} onClick={tempLockModal.onClose}>
              Hủy
            </Button>
            <Button colorScheme="orange" isLoading={tempLock.isPending} onClick={() => void runTempLock()}>
              Tạm khóa
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </VStack>
  )
}
