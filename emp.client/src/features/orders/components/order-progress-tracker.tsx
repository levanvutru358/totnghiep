import { Box, Button, HStack, Text, VStack } from '@chakra-ui/react'
import { CheckCircleIcon } from '@chakra-ui/icons'
import { orderStatusMeta } from '../../commerce/lib/commerce.utils'
import type { ClientOrderStatus } from '../../commerce/types/commerce.type'

const progressSteps: Array<{ status: ClientOrderStatus; label: string }> = [
  { status: 'PLACED', label: 'Đã đặt' },
  { status: 'CONFIRMED', label: 'Đã xác nhận' },
  { status: 'SHIPPED', label: 'Đang giao' },
  { status: 'DELIVERED', label: 'Đã giao' },
  { status: 'COMPLETED', label: 'Hoàn tất' },
]

const statusRank: Partial<Record<ClientOrderStatus, number>> = {
  PLACED: 1,
  CONFIRMED: 2,
  PACKED: 2,
  SHIPPED: 3,
  DELIVERED: 4,
  COMPLETED: 5,
}

const getProgressRank = (status: ClientOrderStatus) => statusRank[status] ?? 0

type OrderProgressTrackerProps = {
  status: ClientOrderStatus
  paymentStatus: string
  onBuyAgain?: () => void
  buyAgainLoading?: boolean
}

export const OrderProgressTracker = ({
  status,
  paymentStatus,
  onBuyAgain,
  buyAgainLoading,
}: OrderProgressTrackerProps) => {
  if (status === 'CANCELLED' || status === 'REFUNDED') {
    return (
      <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
        <Text fontWeight="800" color="red.600">
          {orderStatusMeta[status]?.label ?? status}
        </Text>
        <Text fontSize="sm" color="red.500" mt={1}>
          {status === 'CANCELLED'
            ? 'Đơn hàng không còn được xử lý giao. Bạn có thể mua lại các sản phẩm trong đơn.'
            : 'Đơn hàng không còn được xử lý giao.'}
        </Text>
        {status === 'CANCELLED' && onBuyAgain ? (
          <Button
            mt={3}
            size="sm"
            colorScheme="pink"
            bg="brand.600"
            _hover={{ bg: 'brand.700' }}
            onClick={onBuyAgain}
            isLoading={buyAgainLoading}
          >
            Mua lại
          </Button>
        ) : null}
      </Box>
    )
  }

  if (status === 'RETURN_REQUESTED' || status === 'RETURNED') {
    return (
      <Box bg="orange.50" borderWidth="1px" borderColor="orange.100" borderRadius="xl" p={4}>
        <Text fontWeight="800" color="orange.700">
          {orderStatusMeta[status]?.label ?? status}
        </Text>
        <Text fontSize="sm" color="orange.600" mt={1}>
          Shop đang xử lý yêu cầu trả hàng của bạn.
        </Text>
      </Box>
    )
  }

  if (paymentStatus !== 'PAID' && paymentStatus !== 'PARTIALLY_REFUNDED') {
    return (
      <Box bg="orange.50" borderWidth="1px" borderColor="orange.100" borderRadius="xl" p={4}>
        <Text fontWeight="800" color="orange.700">
          Chờ thanh toán
        </Text>
        <Text fontSize="sm" color="orange.600" mt={1}>
          Đơn sẽ được xử lý sau khi thanh toán thành công.
        </Text>
      </Box>
    )
  }

  const currentRank = getProgressRank(status)

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={4}>
      <Text fontWeight="800" fontSize="sm" mb={3}>
        Tiến trình đơn hàng
      </Text>
      <VStack align="stretch" spacing={0}>
        {progressSteps.map((step, index) => {
          const stepRank = getProgressRank(step.status)
          const done = currentRank >= stepRank && stepRank > 0
          const active = status === step.status || (status === 'PACKED' && step.status === 'CONFIRMED')

          return (
            <HStack key={step.status} align="start" spacing={3} pb={index < progressSteps.length - 1 ? 3 : 0}>
              <VStack spacing={0} align="center">
                <Box
                  w="28px"
                  h="28px"
                  borderRadius="full"
                  bg={done || active ? 'brand.600' : 'gray.100'}
                  color={done || active ? 'white' : 'gray.400'}
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  fontSize="xs"
                  fontWeight="800"
                >
                  {done ? <CheckCircleIcon boxSize={4} /> : index + 1}
                </Box>
                {index < progressSteps.length - 1 ? (
                  <Box w="2px" flex="1" minH="20px" bg={done ? 'brand.300' : 'gray.200'} />
                ) : null}
              </VStack>
              <Box pt={0.5}>
                <Text fontWeight={active || (done && index === progressSteps.length - 1) ? '800' : '600'}>
                  {step.label}
                </Text>
                {active ? (
                  <Text fontSize="xs" color="brand.600" mt={0.5}>
                    Trạng thái hiện tại
                  </Text>
                ) : null}
              </Box>
            </HStack>
          )
        })}
      </VStack>
    </Box>
  )
}
