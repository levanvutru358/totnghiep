import React from 'react'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { ProductForm } from '../components/product-form'

export const ProductCreatePage: React.FC = () => {
  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Tạo sản phẩm</Heading>
        <Text color="text.secondary">
          Điền đủ: tên, giá (VNĐ), thương hiệu, loại danh mục con (VD: Giày chạy bộ → Road running), ít nhất 1 biến thể (size/màu/SKU), và ảnh (link hoặc upload).
        </Text>
      </Box>
      <Box bg="surface.card" borderWidth="1px" borderRadius="lg" p={6}>
        <ProductForm />
      </Box>
    </VStack>
  )
}