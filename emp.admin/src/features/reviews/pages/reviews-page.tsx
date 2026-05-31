import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
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
import { useAdminReviews, useReviewMutations } from '../hooks/use-reviews'
import { renderStars, reviewStatusColor, reviewStatusLabel } from '../lib/review-labels'
import type { ReviewFilters, ReviewStatus } from '../types/review.type'

export const ReviewsPage = () => {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<ReviewFilters['status']>('')
  const [rating, setRating] = useState('')
  const [productId, setProductId] = useState('')
  const [page, setPage] = useState(1)

  const filters = useMemo(
    (): ReviewFilters => ({
      search: search.trim() || undefined,
      status: status || undefined,
      rating: rating ? Number(rating) : undefined,
      productId: productId.trim() || undefined,
      page,
      limit: 20,
    }),
    [search, status, rating, productId, page],
  )

  const { data, isLoading, isError, refetch } = useAdminReviews(filters)
  const { hide, remove } = useReviewMutations()

  const runHide = async (reviewId: number) => {
    try {
      await hide.mutateAsync({ id: reviewId })
      toast.success('Đã cập nhật')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại')
    }
  }

  const runDelete = async (reviewId: number) => {
    if (!window.confirm('Xóa đánh giá này?')) return
    try {
      await remove.mutateAsync(reviewId)
      toast.success('Đã xóa đánh giá')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Đánh giá sản phẩm</Heading>
        <Text color="text.secondary">Quản lý đánh giá 1–5 sao và bình luận của khách hàng.</Text>
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4} boxShadow="sm">
        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }} gap={3}>
          <FormControl>
            <FormLabel fontSize="sm">Tìm kiếm</FormLabel>
            <Input
              size="sm"
              bg="white"
              placeholder="Bình luận, SP, khách..."
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
              bg="white"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as ReviewFilters['status'])
                setPage(1)
              }}
            >
              <option value="">Tất cả</option>
              {(Object.keys(reviewStatusLabel) as ReviewStatus[]).map((s) => (
                <option key={s} value={s}>
                  {reviewStatusLabel[s]}
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Số sao</FormLabel>
            <Select
              size="sm"
              bg="white"
              value={rating}
              onChange={(e) => {
                setRating(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Tất cả</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n} sao
                </option>
              ))}
            </Select>
          </FormControl>
          <FormControl>
            <FormLabel fontSize="sm">Mã sản phẩm</FormLabel>
            <Input
              size="sm"
              bg="white"
              placeholder="productId"
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value)
                setPage(1)
              }}
            />
          </FormControl>
        </Grid>
        {data && (
          <Text fontSize="sm" color="text.secondary" mt={2}>
            {data.total} đánh giá
          </Text>
        )}
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={6} overflowX="auto" boxShadow="sm">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Sản phẩm</Th>
              <Th>Khách</Th>
              <Th>Sao</Th>
              <Th>Bình luận</Th>
              <Th>Trạng thái</Th>
              <Th>Thời gian</Th>
              <Th>Thao tác</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading &&
              [...Array(5)].map((_, i) => (
                <Tr key={`rev-sk-${i}`}>
                  {[...Array(7)].map((__, c) => (
                    <Td key={c}>
                      <Skeleton height="16px" borderRadius="md" />
                    </Td>
                  ))}
                </Tr>
              ))}
            {isError && (
              <Tr>
                <Td colSpan={7}>
                  <HStack>
                    <Text color="red.500">Không tải được danh sách.</Text>
                    <Button size="xs" onClick={() => void refetch()}>
                      Thử lại
                    </Button>
                  </HStack>
                </Td>
              </Tr>
            )}
            {(data?.items ?? []).map((row) => (
              <Tr key={row.id}>
                <Td>
                  <Text fontWeight="600" fontSize="sm">
                    {row.productName}
                  </Text>
                  <Text fontSize="xs" color="text.secondary">
                    #{row.productId}
                  </Text>
                </Td>
                <Td>
                  <Text fontSize="sm">{row.userName}</Text>
                  {row.userEmail && (
                    <Text fontSize="xs" color="text.secondary">
                      {row.userEmail}
                    </Text>
                  )}
                </Td>
                <Td>
                  <Text fontSize="sm" color="orange.500">
                    {renderStars(row.rating)}
                  </Text>
                </Td>
                <Td maxW="280px">
                  {row.title && (
                    <Text fontSize="sm" fontWeight="600">
                      {row.title}
                    </Text>
                  )}
                  <Text fontSize="sm" noOfLines={3}>
                    {row.content}
                  </Text>
                </Td>
                <Td>
                  <Badge colorScheme={reviewStatusColor[row.status]}>{reviewStatusLabel[row.status]}</Badge>
                </Td>
                <Td whiteSpace="nowrap" fontSize="xs">
                  {new Date(row.createdAt).toLocaleString('vi-VN')}
                </Td>
                <Td>
                  <VStack align="stretch" spacing={1}>
                    {row.status !== 'HIDDEN' && (
                      <Button size="xs" variant="ghost" onClick={() => void runHide(row.id)} isLoading={hide.isPending}>
                        Ẩn
                      </Button>
                    )}
                    <Button
                      size="xs"
                      colorScheme="red"
                      variant="outline"
                      onClick={() => void runDelete(row.id)}
                      isLoading={remove.isPending}
                    >
                      Xóa
                    </Button>
                  </VStack>
                </Td>
              </Tr>
            ))}
            {!isLoading && !isError && (data?.items.length ?? 0) === 0 && (
              <Tr>
                <Td colSpan={7}>
                  <Text color="text.secondary" py={4} textAlign="center">
                    Không có đánh giá phù hợp.
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>

        {data && data.totalPages > 1 && (
          <HStack justify="flex-end" mt={4} gap={2}>
            <Button size="sm" variant="outline" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Trước
            </Button>
            <Text fontSize="sm">
              Trang {page} / {data.totalPages}
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
      </Box>
    </VStack>
  )
}
