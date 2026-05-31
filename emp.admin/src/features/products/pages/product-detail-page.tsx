import React from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { toast } from 'react-hot-toast'
import {
  Badge,
  Box,
  Button,
  Grid,
  Heading,
  HStack,
  Image,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react'
import { useProductDetail } from '../hooks/use-product-detail'
import { useRelatedProducts } from '../hooks/use-related-products'
import { useDeleteProduct } from '../hooks/use-delete-product'
import { ROUTES } from '../../../app/router/route-names'
import { formatProductPrice } from '../../../lib/product-price'
import { resolveMediaUrl } from '../lib/media-url'
import { useAuthStore } from '../../../app/store/app.store'

const trangThaiSanPham: Record<string, string> = {
  active: 'Đang bán',
  inactive: 'Ngưng bán',
}

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const hasPermission = useAuthStore((state) => state.hasPermission)
  const { data: product, isLoading } = useProductDetail(id!)
  const { data: relatedProducts } = useRelatedProducts(id || '')
  const deleteProduct = useDeleteProduct()

  const gallery =
    product?.images && product.images.length > 0
      ? product.images
      : product?.image
        ? [product.image]
        : []

  const handleDelete = async () => {
    if (!product) return
    const confirmed = window.confirm(
      `Xóa sản phẩm "${product.name}"?\n\nSản phẩm sẽ ngưng hiển thị trên shop.`,
    )
    if (!confirmed) return

    try {
      await deleteProduct.mutateAsync(product.id)
      toast.success('Đã xóa sản phẩm')
      navigate(ROUTES.PRODUCTS)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Xóa sản phẩm thất bại'
      toast.error(message)
    }
  }

  if (isLoading) {
    return <Text>Đang tải chi tiết sản phẩm...</Text>
  }

  if (!product) {
    return (
      <VStack spacing={4} py={8}>
        <Text>Không tìm thấy sản phẩm</Text>
        <Button as={Link} to={ROUTES.PRODUCTS} variant="outline">
          Quay lại danh sách
        </Button>
      </VStack>
    )
  }

  return (
    <VStack align="stretch" gap={6}>
      <HStack justify="space-between" align="start" flexWrap="wrap" gap={3}>
        <Box>
          <Heading size="lg">{product.name}</Heading>
          <Text color="text.secondary">Chi tiết và thông tin sản phẩm</Text>
        </Box>
        <HStack>
          {hasPermission('products.update') ? (
            <Button as={Link} to={ROUTES.PRODUCT_EDIT.replace(':id', product.id)} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Chỉnh sửa
            </Button>
          ) : null}
          {hasPermission('products.delete') ? (
            <Button
              colorScheme="red"
              variant="outline"
              isLoading={deleteProduct.isPending}
              onClick={() => void handleDelete()}
            >
              Xóa sản phẩm
            </Button>
          ) : null}
        </HStack>
      </HStack>

      <Grid templateColumns={{ base: '1fr', lg: '1fr 2fr' }} gap={6}>
        <Box bg="surface.card" borderWidth="1px" borderRadius="lg" p={6}>
          {gallery.length > 0 ? (
            <VStack align="stretch" spacing={3}>
              <Image
                src={resolveMediaUrl(gallery[0])}
                alt={product.name}
                borderRadius="md"
                w="100%"
                h="260px"
                objectFit="contain"
                bg="gray.50"
              />
              {gallery.length > 1 ? (
                <SimpleGrid columns={4} spacing={2}>
                  {gallery.map((src) => (
                    <Image
                      key={src}
                      src={resolveMediaUrl(src)}
                      alt=""
                      borderRadius="md"
                      h="64px"
                      objectFit="contain"
                      bg="gray.50"
                      borderWidth="1px"
                    />
                  ))}
                </SimpleGrid>
              ) : null}
            </VStack>
          ) : (
            <Box h="260px" bg="gray.100" borderRadius="md" display="flex" alignItems="center" justifyContent="center">
              <Text color="text.secondary">Chưa có ảnh</Text>
            </Box>
          )}
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderRadius="lg" p={6}>
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={6}>
            <Box>
              <Heading size="sm" mb={3}>
                Thông tin sản phẩm
              </Heading>
              <VStack align="start" gap={2}>
                <Text>
                  <strong>Giá bán:</strong> {formatProductPrice(product.price)}
                  {product.salePrice != null && product.basePrice > product.price ? (
                    <>
                      {' '}
                      <Text as="span" color="text.secondary" textDecoration="line-through">
                        {formatProductPrice(product.basePrice)}
                      </Text>
                    </>
                  ) : null}
                </Text>
                <Text>
                  <strong>Thương hiệu:</strong> {product.brand}
                </Text>
                <Text>
                  <strong>Danh mục:</strong> {product.category}
                </Text>
                <Text>
                  <strong>Tồn kho:</strong> {product.stock}
                </Text>
                <Badge colorScheme={product.status === 'active' ? 'green' : 'red'}>
                  {trangThaiSanPham[product.status] ?? product.status}
                </Badge>
              </VStack>
            </Box>
            <Box>
              <Heading size="sm" mb={3}>
                Mô tả
              </Heading>
              <Text color="text.secondary">{product.description || 'Chưa có mô tả'}</Text>
            </Box>
          </Grid>

          <Box mt={6}>
            <Heading size="sm" mb={3}>
              Biến thể
            </Heading>
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Kích cỡ</Th>
                  <Th>Màu sắc</Th>
                  <Th>SKU</Th>
                  <Th>Tồn kho</Th>
                </Tr>
              </Thead>
              <Tbody>
                {product.variants.map((variant) => (
                  <Tr key={variant.id}>
                    <Td>{variant.size}</Td>
                    <Td>{variant.color}</Td>
                    <Td>{variant.sku}</Td>
                    <Td>{variant.stock}</Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </Box>
        </Box>
      </Grid>

      <Box bg="surface.card" borderWidth="1px" borderRadius="lg" p={6}>
        <Heading size="sm" mb={3}>
          Sản phẩm liên quan
        </Heading>
        {relatedProducts && relatedProducts.length > 0 ? (
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={3}>
            {relatedProducts.map((related) => (
              <Link key={related.id} to={ROUTES.PRODUCT_DETAIL.replace(':id', related.id)}>
                <Box borderWidth="1px" borderRadius="md" p={3} _hover={{ borderColor: 'brand.400' }}>
                  <Text fontWeight="600">{related.name}</Text>
                  <Text fontSize="sm" color="text.secondary">
                    {related.category} · {formatProductPrice(related.price)}
                  </Text>
                </Box>
              </Link>
            ))}
          </Grid>
        ) : (
          <Text color="text.secondary">Không có sản phẩm liên quan.</Text>
        )}
      </Box>
    </VStack>
  )
}
