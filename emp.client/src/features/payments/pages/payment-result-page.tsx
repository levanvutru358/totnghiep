import { CheckCircleIcon } from '@chakra-ui/icons'
import { Box, Button, Heading, Spinner, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { buildPaymentReturnResolveQuery } from '../../commerce/lib/commerce.utils'
import { commerceApi } from '../../commerce/services/commerce.api'

export const PaymentResultPage = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [serverEnabled, setServerEnabled] = useState(() => commerceApi.hasServerToken())
  const [remoteError, setRemoteError] = useState('')
  const [settling, setSettling] = useState(true)

  useEffect(() => {
    if (!serverEnabled) {
      setSettling(false)
      return
    }

    const query = buildPaymentReturnResolveQuery(searchParams)
    if (Object.keys(query).length === 0) {
      setRemoteError('Thiếu thông tin giao dịch từ cổng thanh toán.')
      setSettling(false)
      return
    }

    void (async () => {
      try {
        setSettling(true)
        setRemoteError('')

        const { order, payment } = await commerceApi.resolvePaymentReturn(query)
        const paid =
          payment.status === 'SUCCEEDED' ||
          order.paymentStatus === 'PAID' ||
          searchParams.get('paymentStatus') === 'SUCCEEDED'

        if (paid) {
          navigate(
            `${ROUTES.HOME}?payment=success&orderCode=${encodeURIComponent(order.orderCode)}`,
            { replace: true },
          )
          return
        }

        navigate(`${ROUTES.PAYMENT.replace(':orderCode', order.orderCode)}?mode=api`, {
          replace: true,
        })
      } catch (error) {
        setRemoteError(error instanceof Error ? error.message : 'Không thể xác nhận thanh toán.')
        setSettling(false)
      }
    })()
  }, [navigate, searchParams, serverEnabled])

  if (!serverEnabled) {
    return (
      <VStack align="stretch" spacing={4}>
        <LoginRequiredPrompt
          description="Đăng nhập để xác nhận kết quả thanh toán."
          onSuccess={async () => {
            setServerEnabled(true)
          }}
        />
        <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
          <VStack spacing={4} textAlign="center">
            <Heading size="md">Cần đăng nhập</Heading>
            <Text color="text.secondary">
              Sau khi đăng nhập, hệ thống sẽ đồng bộ giao dịch và chuyển bạn về trang chủ.
            </Text>
            <Button as={Link} to={ROUTES.HOME} variant="outline">
              Về trang chủ
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  if (settling && !remoteError) {
    return (
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
        <VStack spacing={4}>
          <Spinner color="brand.500" />
          <Text>Đang xác nhận thanh toán...</Text>
        </VStack>
      </Box>
    )
  }

  if (remoteError) {
    return (
      <VStack align="stretch" spacing={4}>
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="xl" p={4}>
          <Text color="red.500">{remoteError}</Text>
        </Box>
        <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
          <VStack spacing={4} textAlign="center">
            <Heading size="md">Không tìm thấy kết quả thanh toán</Heading>
            <Text color="text.secondary">
              Bạn có thể xem đơn hàng trong tài khoản hoặc thử đồng bộ lại từ trang thanh toán.
            </Text>
            <Button as={Link} to={ROUTES.ACCOUNT_ORDERS} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Theo dõi đơn hàng
            </Button>
            <Button as={Link} to={ROUTES.HOME} variant="ghost">
              Về trang chủ
            </Button>
          </VStack>
        </Box>
      </VStack>
    )
  }

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
      <VStack spacing={4} textAlign="center">
        <CheckCircleIcon boxSize={10} color="green.500" />
        <Text>Đang chuyển hướng...</Text>
      </VStack>
    </Box>
  )
}
