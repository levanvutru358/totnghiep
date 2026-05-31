import { Button, HStack, Input, Select, SimpleGrid } from '@chakra-ui/react'
import type { OrderListFilters } from '../types/order.type'

interface OrderFiltersProps {
  filters: OrderListFilters
  onChange: (next: OrderListFilters) => void
  onReset: () => void
}

const statusOptions = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING_PAYMENT', label: 'Chờ thanh toán' },
  { value: 'CONFIRMED', label: 'Đã xác nhận' },
  { value: 'SHIPPED', label: 'Đang giao' },
  { value: 'DELIVERED', label: 'Đã giao' },
  { value: 'COMPLETED', label: 'Hoàn tất' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'RETURN_REQUESTED', label: 'Yêu cầu trả' },
]

const paymentOptions = [
  { value: '', label: 'TT — tất cả' },
  { value: 'UNPAID', label: 'Chưa thanh toán' },
  { value: 'PAID', label: 'Đã thanh toán' },
  { value: 'REFUNDED', label: 'Đã hoàn' },
]

export const OrderFilters = ({ filters, onChange, onReset }: OrderFiltersProps) => (
  <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} gap={3}>
    <Input
      placeholder="Mã đơn, SĐT, email..."
      value={filters.search ?? ''}
      onChange={(e) => onChange({ ...filters, search: e.target.value, page: 1 })}
      bg="white"
    />
    <Select
      value={filters.status ?? ''}
      onChange={(e) => onChange({ ...filters, status: e.target.value, page: 1 })}
      bg="white"
    >
      {statusOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
    <Select
      value={filters.paymentStatus ?? ''}
      onChange={(e) => onChange({ ...filters, paymentStatus: e.target.value, page: 1 })}
      bg="white"
    >
      {paymentOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </Select>
    <HStack>
      <Button flex={1} onClick={onReset} variant="outline">
        Xóa lọc
      </Button>
    </HStack>
  </SimpleGrid>
)
