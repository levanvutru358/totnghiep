import { Avatar, HStack, Skeleton, Text, VStack } from '@chakra-ui/react'
import { SectionCard } from '../../../shared/components/cards/section-card'
import { useTopCustomers } from '../hooks/use-dashboard'

export const TopCustomers = () => {
  const { data, isLoading } = useTopCustomers()

  return (
    <SectionCard title="Khách hàng chi tiêu cao">
      {isLoading ? (
        <VStack align="stretch" gap={3}>
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} height="44px" borderRadius="md" />
          ))}
        </VStack>
      ) : (
        <VStack align="stretch" gap={3}>
          {(data ?? []).map((customer) => (
            <HStack key={customer.id} justify="space-between">
              <HStack>
                <Avatar size="sm" name={customer.name} />
                <VStack align="start" gap={0}>
                  <Text fontSize="sm" fontWeight="600">{customer.name}</Text>
                  <Text fontSize="xs" color="text.secondary">{customer.email}</Text>
                </VStack>
              </HStack>
              <Text fontSize="sm" fontWeight="700">${customer.totalSpent.toLocaleString()}</Text>
            </HStack>
          ))}
        </VStack>
      )}
    </SectionCard>
  )
}
