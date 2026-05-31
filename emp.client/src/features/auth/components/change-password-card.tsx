import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  Input,
  InputGroup,
  InputRightElement,
  SimpleGrid,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useState } from 'react'
import { clearClientAuthSession, mapAuthErrorMessage } from '../lib/auth-password-messages'
import { clientAuthApi } from '../services/client-auth.api'

const MIN_PASSWORD_LEN = 8

export interface ChangePasswordCardProps {
  onPasswordChanged?: () => void
  embedded?: boolean
}

export const ChangePasswordCard = ({ onPasswordChanged, embedded }: ChangePasswordCardProps) => {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    if (!currentPassword.trim() || !newPassword.trim()) {
      setError('Vui lòng nhập đủ mật khẩu.')
      return
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      setError('Mật khẩu mới tối thiểu 8 ký tự.')
      return
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu không khớp.')
      return
    }
    if (currentPassword === newPassword) {
      setError('Mật khẩu mới phải khác mật khẩu hiện tại.')
      return
    }

    try {
      setLoading(true)
      await clientAuthApi.changePassword(currentPassword, newPassword)
      clearClientAuthSession()
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setSuccess('Đã đổi mật khẩu. Vui lòng đăng nhập lại.')
      onPasswordChanged?.()
    } catch (err) {
      setError(mapAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const passwordInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    onToggle: () => void,
  ) => (
    <Box>
      <Text fontSize="md" fontWeight="600" color="text.secondary" mb={2}>
        {label}
      </Text>
      <InputGroup size="md">
        <Input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          bg="white"
          borderColor="border.muted"
          pr="44px"
        />
        <InputRightElement h="full" pr={1}>
          <Button size="sm" variant="ghost" onClick={onToggle} aria-label={show ? 'Ẩn' : 'Hiện'}>
            {show ? <ViewOffIcon boxSize={4} /> : <ViewIcon boxSize={4} />}
          </Button>
        </InputRightElement>
      </InputGroup>
    </Box>
  )

  const form = (
    <VStack align="stretch" spacing={4}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
        {passwordInput('Mật khẩu hiện tại', currentPassword, setCurrentPassword, showCurrent, () =>
          setShowCurrent((v) => !v),
        )}
        {passwordInput('Mật khẩu mới', newPassword, setNewPassword, showNew, () => setShowNew((v) => !v))}
        <Box>
          <Text fontSize="md" fontWeight="600" color="text.secondary" mb={2}>
            Xác nhận
          </Text>
          <Input
            size="md"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            bg="white"
            borderColor="border.muted"
          />
        </Box>
      </SimpleGrid>
      {error ? (
        <Text fontSize="sm" color="red.500">
          {error}
        </Text>
      ) : null}
      {success ? (
        <Text fontSize="sm" color="green.600">
          {success}
        </Text>
      ) : null}
      <Button
        alignSelf="flex-start"
        size="md"
        height="48px"
        px={8}
        colorScheme="pink"
        bg="brand.600"
        _hover={{ bg: 'brand.700' }}
        onClick={() => void handleSubmit()}
        isLoading={loading}
      >
        Cập nhật mật khẩu
      </Button>
    </VStack>
  )

  if (embedded) return form

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={{ base: 5, md: 7 }}>
      <Text fontWeight="800" fontSize="lg" mb={2}>
        Đổi mật khẩu
      </Text>
      <Text color="text.secondary" fontSize="sm" mb={4}>
        Sau khi đổi, bạn sẽ được đăng xuất trên mọi thiết bị.
      </Text>
      {form}
    </Box>
  )
}
