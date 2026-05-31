import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  IconButton,
  Skeleton,
  Stat,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
  SimpleGrid,
} from '@chakra-ui/react'
import { DeleteIcon, EditIcon, ViewIcon } from '@chakra-ui/icons'
import { useProducts } from '../hooks/use-products'
import { useDeleteProduct } from '../hooks/use-delete-product'
import { ProductFilter } from '../components/product-filter'
import { ROUTES } from '../../../app/router/route-names'
import type { ProductFilters } from '../types/product.type'
import { useBrands, useCategories } from '../../categories/hooks/use-category-brand'
import { groupCategoriesForSelect } from '../../categories/utils/category-brand.util'
import { formatProductPrice } from '../../../lib/product-price'
import { useAuthStore } from '../../../app/store/app.store'

interface Product {
  id: string
  name: string
  price: number
  basePrice: number
  salePrice: number | null
  brand: string
  status: string
  category: string
  stock: number
  variantCount?: number
}

const getStatusScheme = (status: string) => {
  if (status === 'active') return 'green'
  if (status === 'inactive') return 'red'
  return 'yellow'
}

const trangThaiSanPham: Record<string, string> = {
  active: 'Đang bán',
  inactive: 'Ngưng bán',
}

export const ProductListPage: React.FC = () => {
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const canUpdate = hasPermission('products.update')
  const canDelete = hasPermission('products.delete')

  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    category: '',
    status: '',
  })
  const { data, isLoading } = useProducts({
    page: currentPage,
    search: filters.search,
    category: filters.category,
    brand: filters.brand,
    status: filters.status,
  })
  const deleteProduct = useDeleteProduct()
  const { data: categories } = useCategories()
  const { data: brands } = useBrands()
  const categoryGroups = groupCategoriesForSelect(categories ?? [])

  const brandOptions = [
    { value: '', label: 'Tất cả thương hiệu' },
    ...(brands ?? []).map((brand) => ({ value: brand.name, label: brand.name })),
  ]

  const resetFilters = () => {
    setFilters({ search: '', category: '', brand: '', status: '' })
    setCurrentPage(1)
  }

  const handleDelete = async (item: Product) => {
    const confirmed = window.confirm(
      `Xóa sản phẩm "${item.name}"?\n\nSản phẩm sẽ ngưng hiển thị trên shop (xóa mềm).`,
    )
    if (!confirmed) return

    try {
      await deleteProduct.mutateAsync(item.id)
      toast.success('Đã xóa sản phẩm')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa sản phẩm thất bại'
      toast.error(message)
    }
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="start">
        <Box>
          <Heading size="lg">Sản phẩm</Heading>
          <Text color="text.secondary">Quản lý danh mục sản phẩm và tồn kho.</Text>
        </Box>
        {hasPermission('products.create') ? (
          <Link to={ROUTES.PRODUCT_CREATE}>
            <Button colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Thêm sản phẩm
            </Button>
          </Link>
        ) : null}
      </HStack>

      <SimpleGrid columns={{ base: 1, md: 3 }} gap={4}>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
          <Stat>
            <StatLabel>Tổng sản phẩm</StatLabel>
            <StatNumber>{data?.total ?? 0}</StatNumber>
          </Stat>
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
          <Stat>
            <StatLabel>Trang hiện tại</StatLabel>
            <StatNumber>{currentPage}</StatNumber>
          </Stat>
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderRadius="xl" p={4}>
          <Stat>
            <StatLabel>Sắp hết hàng (&lt; 10)</StatLabel>
            <StatNumber>{(data?.products || []).filter((p) => p.stock < 10).length}</StatNumber>
          </Stat>
        </Box>
      </SimpleGrid>

      <ProductFilter
        filters={filters}
        onFiltersChange={setFilters}
        onReset={resetFilters}
        categoryGroups={categoryGroups}
        brandOptions={brandOptions}
      />

      <Box bg="surface.card" borderWidth="1px" borderRadius="xl" overflowX="auto" boxShadow="sm">
        <Table size="sm" variant="simple">
          <Thead>
            <Tr>
              <Th>Tên sản phẩm</Th>
              <Th>Thương hiệu</Th>
              <Th>Danh mục</Th>
              <Th>Giá</Th>
              <Th>Biến thể</Th>
              <Th>Tồn kho</Th>
              <Th>Trạng thái</Th>
              <Th textAlign="right">Thao tác</Th>
            </Tr>
          </Thead>
          <Tbody>
            {isLoading &&
              [...Array(6)].map((_, index) => (
                <Tr key={`skeleton-${index}`}>
                  <Td colSpan={8}>
                    <Skeleton height="16px" borderRadius="md" />
                  </Td>
                </Tr>
              ))}
            {(data?.products || []).map((item: Product) => (
              <Tr key={item.id}>
                <Td>
                  <Link to={ROUTES.PRODUCT_DETAIL.replace(':id', item.id)}>{item.name}</Link>
                </Td>
                <Td>{item.brand}</Td>
                <Td>
                  <Badge variant="subtle">{item.category}</Badge>
                </Td>
                <Td>
                  <Text fontWeight="700">{formatProductPrice(item.price)}</Text>
                  {item.salePrice != null && item.basePrice > item.price ? (
                    <Text fontSize="xs" color="text.secondary" textDecoration="line-through">
                      {formatProductPrice(item.basePrice)}
                    </Text>
                  ) : null}
                </Td>
                <Td>
                  <Badge colorScheme="purple">{item.variantCount ?? 0}</Badge>
                </Td>
                <Td>
                  <Text fontWeight="700" color={item.stock < 10 ? 'orange.500' : 'text.primary'}>
                    {item.stock}
                  </Text>
                </Td>
                <Td>
                  <Badge colorScheme={getStatusScheme(item.status)}>
                    {trangThaiSanPham[item.status] ?? item.status}
                  </Badge>
                </Td>
                <Td>
                  <HStack justify="flex-end" spacing={1}>
                    <IconButton
                      as={Link}
                      to={ROUTES.PRODUCT_DETAIL.replace(':id', item.id)}
                      aria-label="Xem chi tiết"
                      icon={<ViewIcon />}
                      size="sm"
                      variant="ghost"
                    />
                    {canUpdate ? (
                      <IconButton
                        as={Link}
                        to={ROUTES.PRODUCT_EDIT.replace(':id', item.id)}
                        aria-label="Sửa sản phẩm"
                        icon={<EditIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="blue"
                      />
                    ) : null}
                    {canDelete ? (
                      <IconButton
                        aria-label="Xóa sản phẩm"
                        icon={<DeleteIcon />}
                        size="sm"
                        variant="ghost"
                        colorScheme="red"
                        isLoading={deleteProduct.isPending}
                        onClick={() => void handleDelete(item)}
                      />
                    ) : null}
                  </HStack>
                </Td>
              </Tr>
            ))}
            {!isLoading && (!data || data.products.length === 0) && (
              <Tr>
                <Td colSpan={8}>
                  <Text color="text.secondary">Không tìm thấy sản phẩm.</Text>
                </Td>
              </Tr>
            )}
          </Tbody>
        </Table>
      </Box>

      {data && data.totalPages > 1 && (
        <HStack justify="flex-end" gap={2}>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p - 1)}
            isDisabled={currentPage <= 1}
          >
            Trước
          </Button>
          <Text fontSize="sm">
            Trang {currentPage}/{data.totalPages}
          </Text>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((p) => p + 1)}
            isDisabled={currentPage >= data.totalPages}
          >
            Sau
          </Button>
        </HStack>
      )}
    </VStack>
  )
}
