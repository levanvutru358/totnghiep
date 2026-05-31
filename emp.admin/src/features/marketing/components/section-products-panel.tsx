import {
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  Grid,
  HStack,
  Image,
  Input,
  Skeleton,
  Switch,
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
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatProductPrice } from '../../../lib/product-price'
import { resolveMediaUrl } from '../../products/lib/media-url'
import { FlashSaleFormModal } from './flash-sale-form-modal'
import {
  useMarketingHomeSectionMutations,
  useMarketingHomeSections,
  useMarketingSectionProductMutations,
  useMarketingSectionProducts,
} from '../hooks/use-marketing'
import type {
  MarketingHomeSectionCode,
  MarketingHomeSectionFormInput,
  MarketingSectionProduct,
  MarketingSectionProductFormInput,
} from '../types/marketing.type'

const toLocalInput = (value: string | null) => (value ? value.slice(0, 16) : '')

const emptyProductForm = (): MarketingSectionProductFormInput => ({
  productId: '',
  badgeLabel: '',
  discountPercent: '',
  sortOrder: 0,
  isActive: true,
  endsAt: '',
})

const productToForm = (row: MarketingSectionProduct): MarketingSectionProductFormInput => ({
  productId: Number(row.productId),
  badgeLabel: row.badgeLabel ?? '',
  discountPercent: row.discountPercent ?? '',
  sortOrder: row.sortOrder,
  isActive: row.isActive,
  endsAt: toLocalInput(row.endsAt),
})

const effectiveProductPrice = (product: { basePrice: number; salePrice: number | null }) => {
  if (product.salePrice != null && product.salePrice < product.basePrice) return product.salePrice
  return product.basePrice
}

type SectionProductsPanelProps = {
  section: MarketingHomeSectionCode
  description: string
  showEndsAt?: boolean
}

export const SectionProductsPanel = ({ section, description, showEndsAt = false }: SectionProductsPanelProps) => {
  const modal = useDisclosure()
  const [editing, setEditing] = useState<MarketingSectionProduct | null>(null)
  const [form, setForm] = useState<MarketingSectionProductFormInput>(emptyProductForm())
  const [sectionForm, setSectionForm] = useState<MarketingHomeSectionFormInput | null>(null)

  const { data: sections = [] } = useMarketingHomeSections()
  const { data: items = [], isLoading } = useMarketingSectionProducts(section)
  const sectionMeta = sections.find((row) => row.code === section)
  const mutations = useMarketingSectionProductMutations(section)
  const sectionMutations = useMarketingHomeSectionMutations()

  useEffect(() => {
    if (!sectionMeta) return
    setSectionForm({
      title: sectionMeta.title,
      subtitle: sectionMeta.subtitle ?? '',
      badgeLabel: sectionMeta.badgeLabel ?? '',
      linkUrl: sectionMeta.linkUrl,
      isActive: sectionMeta.isActive,
      sortOrder: sectionMeta.sortOrder,
    })
  }, [sectionMeta])

  const saveSectionMeta = async () => {
    if (!sectionForm) return
    try {
      await sectionMutations.update.mutateAsync({ code: section, body: sectionForm })
      toast.success('Đã cập nhật tiêu đề khối')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại')
    }
  }

  const openCreate = () => {
    setEditing(null)
    setForm(emptyProductForm())
    modal.onOpen()
  }

  const openEdit = (row: MarketingSectionProduct) => {
    setEditing(row)
    setForm(productToForm(row))
    modal.onOpen()
  }

  const excludeProductIds = items
    .filter((row) => row.productId !== editing?.productId)
    .map((row) => row.productId)

  const saveProduct = async () => {
    if (form.productId === '') {
      toast.error('Vui lòng chọn sản phẩm')
      return
    }
    if (form.discountPercent === '') {
      toast.error('Vui lòng nhập % giảm giá (0–100)')
      return
    }
    try {
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, body: form })
        toast.success('Đã cập nhật')
      } else {
        await mutations.create.mutateAsync(form)
        toast.success('Đã thêm sản phẩm')
      }
      modal.onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lưu thất bại')
    }
  }

  return (
    <VStack align="stretch" gap={4}>
      <Text fontSize="sm" color="text.secondary">
        {description}
      </Text>

      {sectionForm ? (
        <Box bg="gray.50" borderWidth="1px" borderRadius="lg" p={4}>
          <Text fontWeight="700" fontSize="sm" mb={3}>
            Tiêu đề hiển thị trên trang chủ
          </Text>
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Tiêu đề khối</FormLabel>
              <Input
                size="sm"
                value={sectionForm.title}
                onChange={(e) => setSectionForm({ ...sectionForm, title: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Mô tả phụ</FormLabel>
              <Input
                size="sm"
                value={sectionForm.subtitle}
                onChange={(e) => setSectionForm({ ...sectionForm, subtitle: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Nhãn (badge)</FormLabel>
              <Input
                size="sm"
                value={sectionForm.badgeLabel}
                onChange={(e) => setSectionForm({ ...sectionForm, badgeLabel: e.target.value })}
                placeholder="VD: SIÊU RẺ"
              />
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Link &quot;Xem tất cả&quot;</FormLabel>
              <Input
                size="sm"
                value={sectionForm.linkUrl}
                onChange={(e) => setSectionForm({ ...sectionForm, linkUrl: e.target.value })}
              />
            </FormControl>
            <FormControl display="flex" alignItems="center" gap={2}>
              <Switch
                size="sm"
                isChecked={sectionForm.isActive}
                onChange={(e) => setSectionForm({ ...sectionForm, isActive: e.target.checked })}
              />
              <FormLabel mb={0} fontSize="sm">
                Hiển thị trên trang chủ
              </FormLabel>
            </FormControl>
          </Grid>
          <Button size="sm" colorScheme="pink" mt={3} onClick={() => void saveSectionMeta()} isLoading={sectionMutations.update.isPending}>
            Lưu tiêu đề khối
          </Button>
        </Box>
      ) : null}

      <HStack justify="flex-end">
        <Button colorScheme="pink" onClick={openCreate}>
          Thêm sản phẩm
        </Button>
      </HStack>

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" overflow="hidden">
        {isLoading ? (
          <Skeleton height="160px" m={4} />
        ) : (
          <Table size="sm">
            <Thead>
              <Tr>
                <Th>Ảnh</Th>
                <Th>Sản phẩm</Th>
                <Th>Giá</Th>
                <Th>Giảm %</Th>
                <Th>TT</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {items.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    {row.product?.thumbnailUrl ? (
                      <Image
                        src={resolveMediaUrl(row.product.thumbnailUrl)}
                        alt={row.product.name}
                        boxSize="48px"
                        borderRadius="md"
                        objectFit="cover"
                      />
                    ) : null}
                  </Td>
                  <Td>
                    <Text fontWeight="700">{row.product?.name ?? `SP #${row.productId}`}</Text>
                    <Text fontSize="xs" color="text.secondary">
                      ID {row.productId}
                      {row.badgeLabel ? ` • ${row.badgeLabel}` : ''}
                    </Text>
                  </Td>
                  <Td>
                    {row.product ? formatProductPrice(effectiveProductPrice(row.product)) : '—'}
                  </Td>
                  <Td>
                    {row.discountPercent != null ? (
                      <Badge colorScheme="orange">-{Math.round(row.discountPercent)}%</Badge>
                    ) : (
                      <Text fontSize="xs" color="text.secondary">
                        —
                      </Text>
                    )}
                  </Td>
                  <Td>
                    <Badge colorScheme={row.isActive ? 'green' : 'gray'}>
                      {row.isActive ? 'Hiện' : 'Ẩn'}
                    </Badge>
                  </Td>
                  <Td>
                    <HStack spacing={2}>
                      <Button size="xs" variant="outline" onClick={() => openEdit(row)}>
                        Sửa
                      </Button>
                      <Button
                        size="xs"
                        variant="outline"
                        colorScheme="red"
                        onClick={async () => {
                          if (!window.confirm('Gỡ sản phẩm khỏi khối này?')) return
                          try {
                            await mutations.remove.mutateAsync(row.id)
                            toast.success('Đã xóa')
                          } catch (err) {
                            toast.error(err instanceof Error ? err.message : 'Xóa thất bại')
                          }
                        }}
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
        {!isLoading && items.length === 0 ? (
          <Text p={6} color="text.secondary" textAlign="center" fontSize="sm">
            Chưa có sản phẩm. Khối này sẽ không hiển thị trên trang chủ cho đến khi bạn thêm.
          </Text>
        ) : null}
      </Box>

      <FlashSaleFormModal
        isOpen={modal.isOpen}
        onClose={modal.onClose}
        title={editing ? 'Sửa sản phẩm' : 'Thêm sản phẩm'}
        form={form}
        onChange={setForm}
        onSave={() => void saveProduct()}
        isSaving={mutations.create.isPending || mutations.update.isPending}
        showEndsAt={showEndsAt}
        excludeProductIds={excludeProductIds}
        lockProduct={Boolean(editing)}
        selectedProductName={editing?.product?.name}
      />
    </VStack>
  )
}
