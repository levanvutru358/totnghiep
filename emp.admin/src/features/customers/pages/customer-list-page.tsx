import {
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
  Select,
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
import { useMemo, useState } from 'react'
import { Link as RouterLink } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { useAdminCustomers } from '../hooks/use-customers'
import { accountStatusColor, accountStatusLabel } from '../lib/customer-labels'
import { formatOrderMoney } from '../../orders/lib/order-labels'
import type { AccountStatus, CustomerListFilters } from '../types/customer.type'

export const CustomerListPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<CustomerListFilters['status']>('all')
  const [page, setPage] = useState(1)

  const filters = useMemo(
    (): CustomerListFilters => ({
      search: search.trim() || undefined,
      status,
      page,
      limit: 20,
    }),
    [search, status, page],
  )

  const { data, isLoading, isError, refetch } = useAdminCustomers(filters)

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Khách hàng</Heading>
        <Text color="text.secondary">
          Danh sách tài khoản khách hàng — tìm kiếm, lọc trạng thái và xem chi tiết.
        </Text>
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
          <FormControl>
            <FormLabel fontSize="sm">Tìm kiếm</FormLabel>
            <Input
              size="sm"
              placeholder="Email hoặc họ tên..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
            />
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Trạng thái</FormLabel>
            <Select
              size="sm"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as CustomerListFilters['status'])
                setPage(1)
              }}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="locked">Khóa vĩnh viễn</option>
              <option value="temp_locked">Tạm khóa</option>
            </Select>
          </FormControl>
        </Grid>
      </Box>

      {isError && (
        <Text color="red.500" fontSize="sm">
          Không tải được danh sách.{' '}
          <Button size="xs" variant="link" onClick={() => void refetch()}>
            Thử lại
          </Button>
        </Text>
      )}

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" overflowX="auto" boxShadow="sm">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>ID</Th>
              <Th>Email</Th>
              <Th>Họ tên</Th>
              <Th>Đơn hàng</Th>
              <Th>Tổng chi tiêu</Th>
              <Th>Trạng thái</Th>
              <Th>Đăng ký</Th>
              <Th textAlign="right">Chi tiết</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <Tr key={i}>
                  <Td colSpan={8}>
                    <Skeleton height="20px" />
                  </Td>
                </Tr>
              ))}

            {!isLoading &&
              data?.items.map((customer) => (
                <Tr key={customer.id}>
                  <Td>{customer.id}</Td>
                  <Td>
                    <Text fontSize="sm" fontWeight="600">
                      {customer.email}
                    </Text>
                  </Td>
                  <Td>{customer.fullName ?? '—'}</Td>
                  <Td>{customer.orderCount}</Td>
                  <Td>{formatOrderMoney(customer.totalSpent)}</Td>
                  <Td>
                    <Badge colorScheme={accountStatusColor[customer.accountStatus as AccountStatus]}>
                      {accountStatusLabel[customer.accountStatus as AccountStatus]}
                    </Badge>
                    {customer.lockReason && (
                      <Text fontSize="xs" color="text.secondary" mt={1} noOfLines={2}>
                        {customer.lockReason}
                      </Text>
                    )}
                  </Td>
                  <Td fontSize="xs" whiteSpace="nowrap">
                    {dayjs(customer.createdAt).format('DD/MM/YYYY')}
                  </Td>
                  <Td textAlign="right">
                    <Link
                      as={RouterLink}
                      to={ROUTES.CUSTOMER_DETAIL.replace(':id', String(customer.id))}
                      fontSize="sm"
                      fontWeight="600"
                      color="brand.600"
                    >
                      Xem
                    </Link>
                  </Td>
                </Tr>
              ))}

            {!isLoading && (data?.items.length ?? 0) === 0 && (
              <Tr>
                <Td colSpan={8}>
                  <Text py={4} textAlign="center" color="text.secondary" fontSize="sm">
                    Không có khách hàng phù hợp.
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {data && data.totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Text fontSize="sm">
            {page} / {data.totalPages}
          </Text>
          <Button
            size="sm"
            variant="outline"
            isDisabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </HStack>
      )}
    </VStack>
  )
}
