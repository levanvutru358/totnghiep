import { Select, Text } from '@chakra-ui/react'
import { createColumnHelper } from '@tanstack/react-table'
import dayjs from 'dayjs'
import { useMemo, useState } from 'react'
import { StatusBadge } from '../../../shared/components/badges/status-badge'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { DataTable } from '../../../shared/components/tables/data-table'
import { useRecentOrders } from '../hooks/use-dashboard'
import type { Order, OrderStatus } from '../types/dashboard.type'

const columnHelper = createColumnHelper<Order>()

const columns = [
  columnHelper.accessor('id', { header: 'Mã đơn' }),
  columnHelper.accessor('customer', { header: 'Khách hàng' }),
  columnHelper.accessor('amount', {
    header: 'Giá trị',
    cell: (info) => `$${info.getValue().toLocaleString()}`,
  }),
  columnHelper.accessor('status', {
    header: 'Trạng thái',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('createdAt', {
    header: 'Ngày tạo',
    sortingFn: 'datetime',
    cell: (info) => (
      <Text fontSize="sm" color="text.secondary">
        {dayjs(info.getValue()).format('DD/MM/YYYY HH:mm')}
      </Text>
    ),
  }),
]

export const RecentOrdersTable = () => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const query = useRecentOrders({ status: statusFilter })

  const tableData = useMemo(() => query.data ?? [], [query.data])

  return (
    <SectionCard
      title="Đơn hàng gần đây"
      actions={
        <Select
          size="sm"
          w="130px"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as OrderStatus | 'all')}
          aria-label="Lọc đơn hàng theo trạng thái"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ xử lý</option>
          <option value="paid">Đã thanh toán</option>
          <option value="shipped">Đang giao</option>
          <option value="cancelled">Đã hủy</option>
        </Select>
      }
    >
      <DataTable
        data={tableData}
        columns={columns}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        emptyText="Không có đơn hàng theo trạng thái đã chọn."
      />
    </SectionCard>
  )
}
