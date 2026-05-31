import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import {
  Badge,
  Box,
  Button,
  Heading,
  HStack,
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
import { useAdminComments, useCommentMutations } from '../hooks/use-comments'
import { commentStatusColor, commentStatusLabel } from '../lib/comment-labels'
import type { CommentFilters, CommentStatus } from '../types/comment.type'

export const CommentsPage = () => {
  const [page, setPage] = useState(1)
  const filters = useMemo((): CommentFilters => ({ page, limit: 20 }), [page])
  const { data, isLoading, isError, refetch } = useAdminComments(filters)
  const { hide, show, remove } = useCommentMutations()

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn()
      toast.success('Đã cập nhật')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Thao tác thất bại')
    }
  }

  const runDelete = async (id: number) => {
    if (!window.confirm('Xóa bình luận này?')) return
    try {
      await remove.mutateAsync(id)
      toast.success('Đã xóa')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Bình luận sản phẩm</Heading>
        <Text color="text.secondary">Quản lý bình luận trên trang sản phẩm.</Text>
      </Box>

      {isError && (
        <Text color="red.500" fontSize="sm">
          Không tải được dữ liệu.{' '}
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
              <Th>Sản phẩm</Th>
              <Th>Khách</Th>
              <Th>Nội dung</Th>
              <Th>Trạng thái</Th>
              <Th>Thời gian</Th>
              <Th textAlign="right">
                Thao tác
              </Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <Tr key={i}>
                  <Td colSpan={7}>
                    <Skeleton height="20px" />
                  </Td>
                </Tr>
              ))}

            {!isLoading &&
              data?.items.map((c) => (
                <Tr key={c.id}>
                  <Td>{c.id}</Td>
                  <Td>
                    <Text fontSize="sm" fontWeight="600">
                      {c.productName ?? `#${c.productId}`}
                    </Text>
                    {c.parentId && (
                      <Text fontSize="xs" color="text.secondary">
                        Trả lời #{c.parentId}
                      </Text>
                    )}
                  </Td>
                  <Td>{c.userName}</Td>
                  <Td maxW="280px">
                    <Text fontSize="sm" noOfLines={3}>
                      {c.content}
                    </Text>
                    {(c.images?.length ?? 0) > 0 && (
                      <HStack mt={2} flexWrap="wrap" gap={1}>
                        {c.images!.map((img) => (
                          <Box
                            key={img.id}
                            as="img"
                            src={img.url}
                            alt=""
                            boxSize="40px"
                            objectFit="cover"
                            borderRadius="md"
                          />
                        ))}
                      </HStack>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={commentStatusColor[c.status as CommentStatus] ?? 'gray'}>
                      {commentStatusLabel[c.status as CommentStatus] ?? c.status}
                    </Badge>
                  </Td>
                  <Td fontSize="xs" whiteSpace="nowrap">
                    {new Date(c.createdAt).toLocaleString('vi-VN')}
                  </Td>
                  <Td>
                    <HStack justify="flex-end" gap={1} flexWrap="wrap">
                      {c.status !== 'HIDDEN' && (
                        <Button size="xs" variant="outline" onClick={() => void run(() => hide.mutateAsync(c.id))}>
                          Ẩn
                        </Button>
                      )}
                      {c.status === 'HIDDEN' && (
                        <Button size="xs" variant="outline" colorScheme="green" onClick={() => void run(() => show.mutateAsync(c.id))}>
                          Hiện
                        </Button>
                      )}
                      <Button size="xs" colorScheme="red" variant="ghost" onClick={() => void runDelete(c.id)}>
                        Xóa
                      </Button>
                    </HStack>
                  </Td>
                </Tr>
              ))}

            {!isLoading && data?.items.length === 0 && (
              <Tr>
                <Td colSpan={7}>
                  <Text py={4} color="text.secondary" textAlign="center">
                    Chưa có bình luận.
                  </Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {data && data.totalPages > 1 && (
        <HStack justify="center" gap={2}>
          <Button size="sm" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Text fontSize="sm">
            {page} / {data.totalPages}
          </Text>
          <Button size="sm" isDisabled={page >= data.totalPages} onClick={() => setPage((p) => p + 1)}>
            Sau
          </Button>
        </HStack>
      )}
    </VStack>
  )
}
