import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Input,
  Link,
  Skeleton,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  VStack,
} from '@chakra-ui/react'
import { createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { DataTable } from '../../../shared/components/tables/data-table'
import { OrderFilters } from '../components/order-filters'
import { OrderStatusBadge, PaymentStatusBadge } from '../components/order-status-badge'
import { useAdminOrders, useAdminReturns } from '../hooks/use-orders'
import { formatOrderMoney, paymentMethodLabel } from '../lib/order-labels'
import { ordersApi } from '../services/orders.api'
import type { AdminOrderSummary, AdminReturnRequest, OrderListFilters } from '../types/order.type'

const orderColumnHelper = createColumnHelper<AdminOrderSummary>()
const returnColumnHelper = createColumnHelper<AdminReturnRequest>()

const orderColumns = [
  orderColumnHelper.accessor('orderCode', {
    header: 'Mã đơn',
    cell: (info) => (
      <Link as={RouterLink} to={ROUTES.ORDER_DETAIL.replace(':id', info.getValue())} fontWeight="700" color="brand.600">
        {info.getValue()}
      </Link>
    ),
  }),
  orderColumnHelper.accessor('recipientName', { header: 'Người nhận' }),
  orderColumnHelper.accessor('userEmail', {
    header: 'Khách',
    cell: (info) => info.getValue() ?? '—',
  }),
  orderColumnHelper.accessor('status', {
    header: 'Trạng thái',
    cell: (info) => <OrderStatusBadge status={info.getValue()} />,
  }),
  orderColumnHelper.accessor('paymentStatus', {
    header: 'Thanh toán',
    cell: (info) => <PaymentStatusBadge status={info.getValue()} />,
  }),
  orderColumnHelper.accessor('paymentMethod', {
    header: 'PTTT',
    cell: (info) => paymentMethodLabel[info.getValue()] ?? info.getValue(),
  }),
  orderColumnHelper.accessor('totalAmount', {
    header: 'Tổng',
    cell: (info) => {
      const row = info.row.original
      return formatOrderMoney(info.getValue(), row.currencyCode)
    },
  }),
  orderColumnHelper.accessor('createdAt', {
    header: 'Ngày tạo',
    cell: (info) => (
      <Text fontSize="sm" color="text.secondary">
        {dayjs(info.getValue()).format('DD/MM/YYYY HH:mm')}
      </Text>
    ),
  }),
  orderColumnHelper.display({
    id: 'actions',
    header: '',
    cell: (info) => {
      const row = info.row.original
      const paid = row.paymentStatus === 'PAID' || row.paymentStatus === 'PARTIALLY_REFUNDED'
      const editable = ['PLACED', 'CONFIRMED', 'PACKED', 'SHIPPED', 'DELIVERED'].includes(row.status)

      if (!paid || !editable) return <Text color="text.secondary">—</Text>

      return (
        <Button
          as={RouterLink}
          to={`${ROUTES.ORDER_DETAIL.replace(':id', row.orderCode)}#admin-status-editor`}
          size="xs"
          variant="outline"
          colorScheme="pink"
        >
          Sửa trạng thái
        </Button>
      )
    },
  }),
]

const returnColumns = [
  returnColumnHelper.accessor('orderCode', {
    header: 'Mã đơn',
    cell: (info) => (
      <Link as={RouterLink} to={ROUTES.ORDER_DETAIL.replace(':id', info.getValue())} fontWeight="700" color="brand.600">
        {info.getValue()}
      </Link>
    ),
  }),
  returnColumnHelper.accessor('recipientName', { header: 'Người nhận' }),
  returnColumnHelper.accessor('returnReason', {
    header: 'Lý do',
    cell: (info) => (
      <Text fontSize="sm" noOfLines={2}>
        {info.getValue() ?? '—'}
      </Text>
    ),
  }),
  returnColumnHelper.accessor('totalAmount', {
    header: 'Giá trị',
    cell: (info) => formatOrderMoney(info.getValue(), info.row.original.currencyCode),
  }),
  returnColumnHelper.accessor('requestedAt', {
    header: 'Yêu cầu lúc',
    cell: (info) => dayjs(info.getValue()).format('DD/MM/YYYY HH:mm'),
  }),
]

export const OrderListPage = () => {
  const [filters, setFilters] = useState<OrderListFilters>({ page: 1, limit: 15 })
  const [returnSearch, setReturnSearch] = useState('')
  const [exporting, setExporting] = useState(false)

  const ordersQuery = useAdminOrders(filters)
  const returnsQuery = useAdminReturns({ page: 1, limit: 15, search: returnSearch })

  const orderRows = useMemo(() => ordersQuery.data?.items ?? [], [ordersQuery.data])
  const returnRows = useMemo(() => returnsQuery.data?.items ?? [], [returnsQuery.data])

  const handleExport = async () => {
    try {
      setExporting(true)
      await ordersApi.exportCsv(filters)
    } finally {
      setExporting(false)
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Đơn hàng</Heading>
          <Text color="text.secondary">Quản lý vận hành đơn, trả hàng và xuất báo cáo.</Text>
        </Box>
        <Button variant="outline" onClick={() => void handleExport()} isLoading={exporting}>
          Xuất CSV
        </Button>
      </HStack>

      <Tabs variant="enclosed" colorScheme="pink">
        <TabList>
          <Tab fontWeight="700">
            Danh sách đơn
            {ordersQuery.data ? (
              <Badge ml={2} borderRadius="full">
                {ordersQuery.data.total}
              </Badge>
            ) : null}
          </Tab>
          <Tab fontWeight="700">
            Yêu cầu trả hàng
            {returnsQuery.data ? (
              <Badge ml={2} colorScheme="pink" borderRadius="full">
                {returnsQuery.data.total}
              </Badge>
            ) : null}
          </Tab>
        </TabList>

        <TabPanels>
          <TabPanel px={0}>
            <VStack align="stretch" gap={4}>
              <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
                <OrderFilters
                  filters={filters}
                  onChange={setFilters}
                  onReset={() => setFilters({ page: 1, limit: 15 })}
                />
              </Box>

              <SectionCard title="Đơn hàng gần đây">
                {ordersQuery.isLoading ? (
                  <Skeleton height="240px" borderRadius="lg" />
                ) : (
                  <DataTable
                    data={orderRows}
                    columns={orderColumns}
                    isError={ordersQuery.isError}
                    onRetry={() => void ordersQuery.refetch()}
                    emptyText="Không có đơn hàng phù hợp."
                  />
                )}
              </SectionCard>

              {ordersQuery.data && ordersQuery.data.totalPages > 1 ? (
                <HStack justify="center" gap={2}>
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={filters.page === 1}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) - 1 }))}
                  >
                    Trước
                  </Button>
                  <Text fontSize="sm">
                    Trang {filters.page ?? 1} / {ordersQuery.data.totalPages}
                  </Text>
                  <Button
                    size="sm"
                    variant="outline"
                    isDisabled={(filters.page ?? 1) >= ordersQuery.data.totalPages}
                    onClick={() => setFilters((prev) => ({ ...prev, page: (prev.page ?? 1) + 1 }))}
                  >
                    Sau
                  </Button>
                </HStack>
              ) : null}
            </VStack>
          </TabPanel>

          <TabPanel px={0}>
            <SectionCard
              title="Yêu cầu trả hàng"
              actions={
                <Input
                  size="sm"
                  w="200px"
                  placeholder="Tìm mã đơn..."
                  value={returnSearch}
                  onChange={(e) => setReturnSearch(e.target.value)}
                  bg="white"
                />
              }
            >
              {returnsQuery.isLoading ? (
                <Skeleton height="200px" borderRadius="lg" />
              ) : (
                <DataTable
                  data={returnRows}
                  columns={returnColumns}
                  isError={returnsQuery.isError}
                  onRetry={() => void returnsQuery.refetch()}
                  emptyText="Chưa có yêu cầu trả hàng."
                />
              )}
            </SectionCard>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  )
}
