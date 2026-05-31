import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Heading,
  HStack,
  Input,
  Skeleton,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useDisclosure,
  VStack,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { toast } from 'react-hot-toast'
import { PromotionFormModal } from '../components/promotion-form-modal'
import { useAdminPromotions, usePromotionMutations } from '../hooks/use-promotions'
import { discountTypeLabel, formatPromotionValue } from '../lib/promotion-labels'
import type { PromotionCode, PromotionFormInput } from '../types/promotion.type'

const emptyForm = (): PromotionFormInput => ({
  code: '',
  name: '',
  description: '',
  discountType: 'FIXED',
  discountValue: 0,
  maxDiscountAmount: null,
  minOrderAmount: 0,
  usageLimit: null,
  usageLimitPerUser: 1,
  startsAt: null,
  endsAt: null,
  isActive: true,
})

const toForm = (row: PromotionCode): PromotionFormInput => ({
  code: row.code,
  name: row.name,
  description: row.description ?? '',
  discountType: row.discountType,
  discountValue: row.discountValue,
  maxDiscountAmount: row.maxDiscountAmount,
  minOrderAmount: row.minOrderAmount,
  usageLimit: row.usageLimit,
  usageLimitPerUser: row.usageLimitPerUser,
  startsAt: row.startsAt,
  endsAt: row.endsAt,
  isActive: row.isActive,
})

export const PromotionsPage = () => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const modal = useDisclosure()
  const [editing, setEditing] = useState<PromotionCode | null>(null)
  const [form, setForm] = useState<PromotionFormInput>(emptyForm())

  const filters = useMemo(() => ({ search: search.trim() || undefined, page, limit: 20 }), [search, page])
  const { data, isLoading, isError, refetch } = useAdminPromotions(filters)
  const { create, update, remove } = usePromotionMutations()

  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm())
    modal.onOpen()
  }

  const openEdit = (row: PromotionCode) => {
    setEditing(row)
    setForm(toForm(row))
    modal.onOpen()
  }

  const save = async () => {
    try {
      if (editing) {
        await update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật mã khuyến mãi')
      } else {
        await create.mutateAsync(form)
        toast.success('Đã tạo mã khuyến mãi')
      }
      modal.onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại')
    }
  }

  const onDelete = async (row: PromotionCode) => {
    if (!window.confirm(`Xóa mã ${row.code}?`)) return
    try {
      await remove.mutateAsync(row.id)
      toast.success('Đã xóa')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">Khuyến mãi</Heading>
          <Text color="text.secondary">Quản lý mã giảm giá áp dụng khi khách thanh toán.</Text>
        </Box>
        <Button colorScheme="pink" onClick={openCreate}>
          Thêm mã khuyến mãi
        </Button>
      </HStack>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
        <FormControl maxW="360px">
          <FormLabel fontSize="sm">Tìm mã hoặc tên</FormLabel>
          <Input
            size="sm"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Nhập GIAM15K, Freeship..."
          />
        </FormControl>
      </Box>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" overflow="hidden">
        {isLoading ? <Skeleton height="280px" /> : null}
        {isError ? (
          <Box p={6}>
            <Text color="red.500">Không tải được danh sách.</Text>
            <Button size="sm" mt={3} onClick={() => void refetch()}>
              Thử lại
            </Button>
          </Box>
        ) : null}
        {!isLoading && !isError ? (
          <>
            {data?.items.length === 0 ? (
              <Box p={10} textAlign="center">
                <Text color="text.secondary">Chưa có mã khuyến mãi.</Text>
                <Button size="sm" colorScheme="pink" mt={4} onClick={openCreate}>
                  Tạo mã đầu tiên
                </Button>
              </Box>
            ) : (
              <Table size="sm">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Mã</Th>
                    <Th>Tên</Th>
                    <Th>Loại</Th>
                    <Th>Ưu đãi</Th>
                    <Th isNumeric>Đơn tối thiểu</Th>
                    <Th isNumeric>Đã dùng</Th>
                    <Th>Trạng thái</Th>
                    <Th />
                  </Tr>
                </Thead>
                <Tbody>
                  {data?.items.map((row) => (
                    <Tr key={row.id} _hover={{ bg: 'gray.50' }}>
                      <Td fontFamily="mono" fontWeight="800" color="brand.600">
                        {row.code}
                      </Td>
                      <Td maxW="200px" isTruncated title={row.name}>
                        {row.name}
                      </Td>
                      <Td fontSize="sm">{discountTypeLabel[row.discountType]}</Td>
                      <Td fontSize="sm">
                        {formatPromotionValue(row.discountType, row.discountValue, row.maxDiscountAmount)}
                      </Td>
                      <Td isNumeric fontSize="sm">
                        {row.minOrderAmount.toLocaleString('vi-VN')}đ
                      </Td>
                      <Td isNumeric fontSize="sm">
                        {row.usedCount}
                        {row.usageLimit != null ? ` / ${row.usageLimit}` : ''}
                      </Td>
                      <Td>
                        <Badge colorScheme={row.isActive ? 'green' : 'gray'} borderRadius="md">
                          {row.isActive ? 'Đang bật' : 'Tắt'}
                        </Badge>
                      </Td>
                      <Td>
                        <HStack spacing={2} justify="flex-end">
                          <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
                            Sửa
                          </Button>
                          <Button
                            size="xs"
                            colorScheme="red"
                            variant="ghost"
                            onClick={() => void onDelete(row)}
                          >
                            Xóa
                          </Button>
                        </HStack>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            )}
          </>
        ) : null}
      </Box>

      {data && data.totalPages > 1 ? (
        <HStack justify="center" gap={2}>
          <Button size="sm" isDisabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Trước
          </Button>
          <Text fontSize="sm">
            Trang {page} / {data.totalPages}
          </Text>
          <Button
            size="sm"
            isDisabled={page >= data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </Button>
        </HStack>
      ) : null}

      <PromotionFormModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        title={editing ? `Sửa mã: ${editing.code}` : 'Thêm mã khuyến mãi'}
        form={form}
        onChange={setForm}
        onSave={() => void save()}
        isSaving={create.isPending || update.isPending}
      />
    </VStack>
  )
}
