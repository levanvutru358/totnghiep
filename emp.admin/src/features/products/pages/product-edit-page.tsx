import React from 'react'
import { useParams } from 'react-router-dom'
import { Box, Heading, Text, VStack } from '@chakra-ui/react'
import { ProductForm } from '../components/product-form'

export const ProductEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()

  return (
    <VStack align="stretch" gap={6}>
      <Box>
        <Heading size="lg">Chỉnh sửa sản phẩm</Heading>
        <Text color="text.secondary">Cập nhật thông tin sản phẩm.</Text>
      </Box>
      <Box bg="surface.card" borderWidth="1px" borderRadius="lg" p={6}>
        <ProductForm productId={id} />
      </Box>
    </VStack>
  )
}