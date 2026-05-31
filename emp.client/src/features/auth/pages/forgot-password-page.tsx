import {
  Box,
  Button,
  Heading,
  Input,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { mapAuthErrorMessage } from '../lib/auth-password-messages'
import { clientAuthApi } from '../services/client-auth.api'

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  const handleSubmit = async () => {
    setError(null)
    const trimmed = email.trim()
    if (!trimmed) {
      setError('Vui lòng nhập email.')
      return
    }

    try {
      setLoading(true)
      await clientAuthApi.forgotPassword(trimmed)
      setSent(true)
    } catch (err) {
      setError(mapAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="480px" mx="auto" py={{ base: 8, md: 12 }}>
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 5, md: 8 }}>
        <Heading size="lg">Quên mật khẩu</Heading>
        <Text color="text.secondary" mt={2} mb={6}>
          Nhập email đã đăng ký. Nếu tài khoản tồn tại, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
        </Text>

        {sent ? (
          <VStack align="stretch" spacing={4}>
            <Box bg="green.50" borderWidth="1px" borderColor="green.100" borderRadius="xl" p={4}>
              <Text color="green.700">
                Nếu email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi. Vui lòng kiểm tra hộp
                thư (và thư mục spam).
              </Text>
            </Box>
            <Button as={Link} to={ROUTES.HOME} variant="outline">
              Về trang chủ
            </Button>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={4}>
            <Box>
              <Text fontWeight="700" mb={2} color="text.secondary">
                Email
              </Text>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                inputMode="email"
                bg="white"
                borderColor="border.muted"
              />
            </Box>

            {error ? (
              <Text fontSize="sm" color="red.500">
                {error}
              </Text>
            ) : null}

            <Button
              bg="red.600"
              color="white"
              _hover={{ bg: 'red.700' }}
              onClick={() => void handleSubmit()}
              isLoading={loading}
            >
              Gửi liên kết đặt lại
            </Button>

            <Button as={Link} to={ROUTES.HOME} variant="link" color="blue.600" fontWeight="700">
              Quay lại trang chủ
            </Button>
          </VStack>
        )}
      </Box>
    </Box>
  )
}
