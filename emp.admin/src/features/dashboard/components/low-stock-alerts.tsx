import { Alert, AlertDescription, AlertIcon, AlertTitle, Badge, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { useLowStockProducts } from '../hooks/use-dashboard'

export const LowStockAlerts = () => {
  const { data, isLoading } = useLowStockProducts()

  return (
    <SectionCard title="Cảnh báo sắp hết hàng">
      {isLoading ? (
        <VStack align="stretch" gap={3}>
          {[...Array(3)].map((_, index) => (
            <Skeleton key={index} height="42px" borderRadius="md" />
          ))}
        </VStack>
      ) : data && data.length > 0 ? (
        <VStack align="stretch" gap={3}>
          {data.map((product) => (
            <Alert key={product.id} status="warning" borderRadius="md">
              <AlertIcon />
              <AlertTitle fontSize="sm" mr={2}>{product.name}</AlertTitle>
              <AlertDescription fontSize="sm" flex={1}>
                SKU {product.sku} chỉ còn {product.stock} sản phẩm trong kho.
              </AlertDescription>
              <Badge colorScheme="orange">Ngưỡng {product.threshold}</Badge>
            </Alert>
          ))}
        </VStack>
      ) : (
        <HStack justify="center" py={4}>
          <Text color="text.secondary">Tồn kho ổn định, không có sản phẩm sắp hết.</Text>
        </HStack>
      )}
    </SectionCard>
  )
}
