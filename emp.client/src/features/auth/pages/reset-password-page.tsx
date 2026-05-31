import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Heading,
  Input,
  InputGroup,
  InputRightElement,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { mapAuthErrorMessage } from '../lib/auth-password-messages'
import { clientAuthApi } from '../services/client-auth.api'

const MIN_PASSWORD_LEN = 8

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = useMemo(() => searchParams.get('token')?.trim() ?? '', [searchParams])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const handleSubmit = async () => {
    setError(null)

    if (!token) {
      setError('Liên kết đặt lại mật khẩu không hợp lệ.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      setError('Mật khẩu tối thiểu 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }

    try {
      setLoading(true)
      await clientAuthApi.resetPassword(token, newPassword)
      setDone(true)
    } catch (err) {
      setError(mapAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box maxW="480px" mx="auto" py={{ base: 8, md: 12 }}>
      <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 5, md: 8 }}>
        <Heading size="lg">Đặt lại mật khẩu</Heading>

        {!token ? (
          <VStack align="stretch" spacing={4} mt={4}>
            <Text color="red.500">Thiếu mã đặt lại. Mở lại liên kết từ email hoặc yêu cầu gửi lại.</Text>
            <Button as={Link} to={ROUTES.FORGOT_PASSWORD} colorScheme="pink" bg="brand.600" _hover={{ bg: 'brand.700' }}>
              Quên mật khẩu
            </Button>
          </VStack>
        ) : done ? (
          <VStack align="stretch" spacing={4} mt={4}>
            <Box bg="green.50" borderWidth="1px" borderColor="green.100" borderRadius="xl" p={4}>
              <Text color="green.700">Mật khẩu đã được cập nhật. Bạn có thể đăng nhập bằng mật khẩu mới.</Text>
            </Box>
            <Button bg="red.600" color="white" _hover={{ bg: 'red.700' }} onClick={() => navigate(ROUTES.HOME)}>
              Về trang chủ để đăng nhập
            </Button>
          </VStack>
        ) : (
          <VStack align="stretch" spacing={4} mt={6}>
            <Text color="text.secondary">Nhập mật khẩu mới cho tài khoản của bạn.</Text>

            <Box>
              <Text fontWeight="700" mb={2} color="text.secondary">
                Mật khẩu mới
              </Text>
              <InputGroup>
                <Input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  bg="white"
                  borderColor="border.muted"
                  pr="42px"
                />
                <InputRightElement h="full" pr={1}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showPassword ? <ViewOffIcon /> : <ViewIcon />}
                  </Button>
                </InputRightElement>
              </InputGroup>
            </Box>

            <Box>
              <Text fontWeight="700" mb={2} color="text.secondary">
                Xác nhận mật khẩu
              </Text>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
              Lưu mật khẩu mới
            </Button>
          </VStack>
        )}
      </Box>
    </Box>
  )
}
