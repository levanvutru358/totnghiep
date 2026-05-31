import { ArrowForwardIcon } from '@chakra-ui/icons'
import {
  Avatar,
  Badge,
  Box,
  Button,
  HStack,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { OrderPaymentBadge, OrderStatusBadge } from '../../commerce/components/status-badge'
import {
  formatDateTime,
  getLatestPaymentRecord,
} from '../../commerce/lib/commerce.utils'
import { formatCatalogVnd } from '../../../lib/money-vnd'
import { formatReorderError, reorderOrderToCart } from '../../commerce/lib/reorder-order'
import { commerceApi } from '../../commerce/services/commerce.api'
import type { OrderRecord, PaymentRecord } from '../../commerce/types/commerce.type'
import { AddressBookCard } from '../components/address-book-card'
import { ChangePasswordCard } from '../../auth/components/change-password-card'
import { EditProfileCard } from '../../auth/components/edit-profile-card'
import { useAuthModal } from '../../auth/context/auth-modal-context'
import { clientAuthApi, type ClientMe } from '../../auth/services/client-auth.api'

const ORDER_PREVIEW_LIMIT = 5

type OrderFilter = 'purchased' | 'unpaid' | 'cancelled' | 'all'

const orderFilters: Array<{ id: OrderFilter; label: string }> = [
  { id: 'purchased', label: 'Đã mua' },
  { id: 'unpaid', label: 'Chờ thanh toán' },
  { id: 'cancelled', label: 'Đã hủy' },
  { id: 'all', label: 'Tất cả' },
]

const getStoredUser = (): ClientMe | null => {
  const raw = localStorage.getItem('client_user')
  if (!raw) return null

  try {
    return JSON.parse(raw) as ClientMe
  } catch {
    localStorage.removeItem('client_user')
    return null
  }
}

const getStoredToken = () =>
  localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token') ?? ''

const cardSx = {
  bg: 'surface.card',
  borderWidth: '1px',
  borderColor: 'border.subtle',
  borderRadius: 'xl',
  overflow: 'hidden',
}

export const AccountProfilePage = () => {
  const { setCurrentUser } = useAuthModal()
  const navigate = useNavigate()
  const toast = useToast()
  const [reorderLoadingCode, setReorderLoadingCode] = useState<string | null>(null)
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [user, setUser] = useState<ClientMe | null>(() => getStoredUser())
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [paymentsByOrder, setPaymentsByOrder] = useState<Record<string, PaymentRecord[]>>({})
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('purchased')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadAccountData = useCallback(async (forceServerEnabled = commerceApi.hasServerToken()) => {
    if (!forceServerEnabled) {
      setOrders([])
      setPaymentsByOrder({})
      setError('')
      return
    }

    try {
      setLoading(true)
      setError('')

      try {
        const profile = await clientAuthApi.meCurrent()
        setUser(profile)
        setCurrentUser(profile)
        localStorage.setItem('client_user', JSON.stringify(profile))
      } catch {
        const token = getStoredToken()
        if (token) {
          try {
            const profile = await clientAuthApi.me(token)
            setUser(profile)
            setCurrentUser(profile)
            localStorage.setItem('client_user', JSON.stringify(profile))
          } catch {
            setUser(getStoredUser())
          }
        }
      }

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
      const paymentEntries = await Promise.all(
        detailedOrders.map(async (order) => {
          try {
            return [order.orderCode, await commerceApi.listPaymentsByOrder(order.orderCode)] as const
          } catch {
            return [order.orderCode, []] as const
          }
        }),
      )

      setOrders(detailedOrders)
      setPaymentsByOrder(Object.fromEntries(paymentEntries))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Không thể tải dữ liệu tài khoản.')
    } finally {
      setLoading(false)
    }
  }, [setCurrentUser])

  useEffect(() => {
    void loadAccountData(serverEnabled)
  }, [loadAccountData, serverEnabled])

  const orderRows = useMemo(
    () =>
      orders.map((order) => ({
        order,
        payment: getLatestPaymentRecord(paymentsByOrder[order.orderCode] ?? []),
      })),
    [orders, paymentsByOrder],
  )

  const classifyRow = useCallback(
    ({ order, payment }: (typeof orderRows)[number]) => {
      const purchased =
        order.paymentStatus === 'PAID' ||
        order.paymentStatus === 'REFUNDED' ||
        payment?.status === 'SUCCEEDED' ||
        payment?.status === 'REFUNDED'
      const cancelled = order.status === 'CANCELLED' || payment?.status === 'CANCELLED'
      return { purchased, cancelled, unpaid: !purchased && !cancelled }
    },
    [],
  )

  const filterCounts = useMemo(() => {
    let purchased = 0
    let unpaid = 0
    let cancelled = 0
    for (const row of orderRows) {
      const c = classifyRow(row)
      if (c.purchased) purchased += 1
      else if (c.cancelled) cancelled += 1
      else unpaid += 1
    }
    return { purchased, unpaid, cancelled, all: orderRows.length }
  }, [orderRows, classifyRow])

  const filteredRows = useMemo(() => {
    if (orderFilter === 'all') return orderRows
    return orderRows.filter((row) => {
      const c = classifyRow(row)
      if (orderFilter === 'purchased') return c.purchased
      if (orderFilter === 'cancelled') return c.cancelled
      return c.unpaid
    })
  }, [orderRows, orderFilter, classifyRow])

  const previewRows = filteredRows.slice(0, ORDER_PREVIEW_LIMIT)
  const displayName = user?.fullName?.trim() || user?.email?.split('@')[0] || 'Khách'

  if (!serverEnabled) {
    return (
      <LoginRequiredPrompt
        description="Đăng nhập để quản lý tài khoản và đơn hàng."
        onSuccess={async () => {
          setServerEnabled(true)
          await loadAccountData(true)
        }}
      />
    )
  }

  return (
    <VStack align="stretch" spacing={6} maxW="container.lg" w="full" mx="auto" px={{ base: 0, md: 2 }}>
      {error ? (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="lg" px={3} py={2}>
          <Text color="red.600" fontSize="sm">
            {error}
          </Text>
        </Box>
      ) : null}

      {/* Tài khoản */}
      <Box {...cardSx}>
        <HStack spacing={4} p={{ base: 5, md: 6 }} pb={4} align="center">
          <Avatar name={displayName} size="lg" bg="brand.600" color="white" />
          <VStack align="start" spacing={1} flex={1} minW={0}>
            <Text fontWeight="800" fontSize={{ base: 'xl', md: '2xl' }} noOfLines={1}>
              {displayName}
            </Text>
            <Text fontSize={{ base: 'md', md: 'lg' }} color="text.secondary" noOfLines={1}>
              {user?.email}
            </Text>
          </VStack>
          <Badge colorScheme="pink" borderRadius="md" px={3} py={1} fontSize="sm">
            {orders.length} đơn
          </Badge>
        </HStack>

        <HStack px={{ base: 5, md: 6 }} pb={4} gap={3} flexWrap="wrap">
          <Button as={Link} to={ROUTES.ACCOUNT_REVIEWS} size="md" variant="outline" colorScheme="pink">
            Đánh giá của tôi
          </Button>
          <Button as={Link} to={ROUTES.ACCOUNT_NOTIFICATIONS} size="md" variant="outline" colorScheme="pink">
            Thông báo
          </Button>
        </HStack>

        <Tabs variant="soft-rounded" colorScheme="pink" size="md" px={{ base: 5, md: 6 }} pb={{ base: 5, md: 6 }}>
          <TabList gap={2} flexWrap="wrap" bg="gray.50" p={1.5} borderRadius="xl">
            <Tab fontSize="md" fontWeight="700" py={2.5} px={5} _selected={{ bg: 'white', color: 'brand.600', shadow: 'sm' }}>
              Hồ sơ
            </Tab>
            <Tab fontSize="md" fontWeight="700" py={2.5} px={5} _selected={{ bg: 'white', color: 'brand.600', shadow: 'sm' }}>
              Địa chỉ
            </Tab>
            <Tab fontSize="md" fontWeight="700" py={2.5} px={5} _selected={{ bg: 'white', color: 'brand.600', shadow: 'sm' }}>
              Mật khẩu
            </Tab>
          </TabList>
          <TabPanels mt={4}>
            <TabPanel px={0} py={0}>
              <EditProfileCard
                embedded
                user={user}
                onProfileUpdated={(profile) => {
                  setUser(profile)
                  setCurrentUser(profile)
                }}
              />
            </TabPanel>
            <TabPanel px={0} py={0}>
              <AddressBookCard embedded />
            </TabPanel>
            <TabPanel px={0} py={0}>
              <ChangePasswordCard
                embedded
                onPasswordChanged={() => {
                  setServerEnabled(false)
                  setUser(null)
                  setOrders([])
                }}
              />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>

      {/* Đơn hàng */}
      <Box {...cardSx}>
        <HStack justify="space-between" px={4} pt={4} pb={2} flexWrap="wrap" gap={2}>
          <Box>
            <Text fontWeight="800" fontSize="md">
              Đơn hàng
            </Text>
            <Text fontSize="xs" color="text.secondary" mt={0.5}>
              Theo dõi trạng thái đơn, thanh toán và giao hàng.
            </Text>
          </Box>
          <HStack spacing={2}>
            <Button as={Link} to={ROUTES.CART} size="xs" variant="ghost" color="text.secondary">
              Giỏ hàng
            </Button>
            <Button as={Link} to={ROUTES.ORDERS} size="xs" variant="link" color="brand.600" fontWeight="700">
              Xem tất cả
            </Button>
          </HStack>
        </HStack>

        <HStack px={4} pb={3} gap={2} flexWrap="wrap">
          {orderFilters.map((filter) => {
            const active = orderFilter === filter.id
            const count = filterCounts[filter.id]
            return (
              <Button
                key={filter.id}
                size="xs"
                height="28px"
                borderRadius="full"
                variant={active ? 'solid' : 'outline'}
                bg={active ? 'brand.600' : 'white'}
                color={active ? 'white' : 'text.secondary'}
                borderColor={active ? 'brand.600' : 'border.muted'}
                _hover={{ bg: active ? 'brand.700' : 'gray.50' }}
                onClick={() => setOrderFilter(filter.id)}
                px={3}
              >
                {filter.label}
                <Badge
                  ml={1.5}
                  borderRadius="full"
                  fontSize="10px"
                  bg={active ? 'whiteAlpha.300' : 'gray.100'}
                  color={active ? 'white' : 'gray.600'}
                >
                  {count}
                </Badge>
              </Button>
            )
          })}
        </HStack>

        {loading && orders.length === 0 ? (
          <HStack justify="center" py={8}>
            <Spinner size="sm" color="brand.500" />
            <Text fontSize="sm" color="text.secondary">
              Đang tải đơn hàng...
            </Text>
          </HStack>
        ) : null}

        {!loading && orders.length === 0 ? (
          <VStack py={8} px={4} spacing={2}>
            <Text fontSize="sm" color="text.secondary">
              Chưa có đơn hàng nào.
            </Text>
            <Button as={Link} to={ROUTES.CATEGORIES} size="sm" variant="outline" borderColor="border.muted">
              Mua sắm ngay
            </Button>
          </VStack>
        ) : null}

        {!loading && orders.length > 0 && filteredRows.length === 0 ? (
          <Text fontSize="sm" color="text.secondary" textAlign="center" py={6} px={4}>
            Không có đơn trong mục này.
          </Text>
        ) : null}

        {previewRows.length > 0 ? (
          <VStack align="stretch" spacing={0} divider={<Box borderColor="border.subtle" />}>
            {previewRows.map(({ order, payment }) => {
              const isCancelled = order.status === 'CANCELLED'
              const canPay =
                !isCancelled &&
                order.paymentStatus !== 'PAID' &&
                order.paymentStatus !== 'REFUNDED' &&
                payment?.status !== 'SUCCEEDED'
              const canTrack = !isCancelled
              const canBuyAgain = isCancelled
              const orderDetailPath = ROUTES.ORDER_DETAIL.replace(':orderCode', order.orderCode)

              const handleBuyAgain = async () => {
                try {
                  setReorderLoadingCode(order.orderCode)
                  const cart = await reorderOrderToCart(order.orderCode)
                  toast({
                    title: 'Đã thêm vào giỏ hàng',
                    description: `${cart.summary.totalQuantity} sản phẩm trong giỏ`,
                    status: 'success',
                    duration: 2500,
                    position: 'top',
                  })
                  navigate(ROUTES.CART)
                } catch (err) {
                  toast({
                    title: formatReorderError(err),
                    status: 'error',
                    duration: 4000,
                    position: 'top',
                  })
                } finally {
                  setReorderLoadingCode(null)
                }
              }

              return (
                <HStack
                  key={order.id}
                  px={4}
                  py={3}
                  align="center"
                  gap={3}
                  _hover={{ bg: 'gray.50' }}
                  transition="background 0.15s"
                >
                  <VStack align="start" spacing={0.5} flex={1} minW={0}>
                    <HStack spacing={2} flexWrap="wrap">
                      <Text fontWeight="800" fontSize="sm">
                        {order.orderCode}
                      </Text>
                      <OrderStatusBadge status={order.status} />
                      <OrderPaymentBadge status={order.paymentStatus} />
                    </HStack>
                    <Text fontSize="xs" color="text.secondary">
                      {formatDateTime(order.createdAt)}
                    </Text>
                  </VStack>

                  <Text fontWeight="800" fontSize="sm" color="brand.700" whiteSpace="nowrap">
                    {formatCatalogVnd(order.totalAmount)}
                  </Text>

                  <VStack spacing={1} flexShrink={0} align="stretch">
                    {canPay ? (
                      <Button
                        as={Link}
                        to={`${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`}
                        size="xs"
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                      >
                        Thanh toán
                      </Button>
                    ) : null}
                    {canBuyAgain ? (
                      <Button
                        size="xs"
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                        onClick={() => void handleBuyAgain()}
                        isLoading={reorderLoadingCode === order.orderCode}
                      >
                        Mua lại
                      </Button>
                    ) : null}
                    {canTrack ? (
                      <Button
                        as={Link}
                        to={orderDetailPath}
                        size="xs"
                        colorScheme="pink"
                        bg="brand.600"
                        _hover={{ bg: 'brand.700' }}
                        rightIcon={<ArrowForwardIcon />}
                      >
                        Theo dõi đơn hàng
                      </Button>
                    ) : (
                      <Button
                        as={Link}
                        to={orderDetailPath}
                        size="xs"
                        variant="outline"
                        borderColor="border.muted"
                      >
                        Chi tiết
                      </Button>
                    )}
                  </VStack>
                </HStack>
              )
            })}
          </VStack>
        ) : null}

        {filteredRows.length > ORDER_PREVIEW_LIMIT ? (
          <Box px={4} py={3} borderTopWidth="1px" borderColor="border.subtle" textAlign="center">
            <Button as={Link} to={ROUTES.ORDERS} size="sm" variant="link" color="brand.600" fontWeight="700">
              Xem thêm {filteredRows.length - ORDER_PREVIEW_LIMIT} đơn
            </Button>
          </Box>
        ) : null}
      </Box>
    </VStack>
  )
}
