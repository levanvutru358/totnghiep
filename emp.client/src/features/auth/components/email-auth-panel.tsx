import { Box, Button, Input, InputGroup, InputRightElement, Text } from '@chakra-ui/react'
import { ViewIcon, ViewOffIcon } from '@chakra-ui/icons'
import { useState } from 'react'

export interface EmailAuthPanelProps {
  mode: 'login' | 'register'
  fullName: string
  onFullNameChange: (value: string) => void
  email: string
  onEmailChange: (value: string) => void
  password: string
  onPasswordChange: (value: string) => void
  confirmPassword: string
  onConfirmPasswordChange: (value: string) => void
  loading: boolean
  error: string | null
  onSubmit: () => void
}

export const EmailAuthPanel = ({
  mode,
  fullName,
  onFullNameChange,
  email,
  onEmailChange,
  password,
  onPasswordChange,
  confirmPassword,
  onConfirmPasswordChange,
  loading,
  error,
  onSubmit,
}: EmailAuthPanelProps) => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  return (
    <>
      {mode === 'register' && (
        <Box>
          <Text fontWeight="700" mb={2} color="text.secondary">
            Tên hiển thị
          </Text>
          <Input
            value={fullName}
            onChange={(e) => onFullNameChange(e.target.value)}
            placeholder="Nhập tên của bạn"
            bg="white"
            borderColor="border.muted"
          />
        </Box>
      )}

      <Box>
        <Text fontWeight="700" mb={2} color="text.secondary">
          Email
        </Text>
        <Input
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          placeholder="Nhập email của bạn"
          inputMode="email"
          bg="white"
          borderColor="border.muted"
        />
      </Box>

      <Box>
        <Text fontWeight="700" mb={2} color="text.secondary">
          Mật khẩu
        </Text>
        <InputGroup>
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            placeholder="Nhập mật khẩu"
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
        {error && (
          <Text mt={2} fontSize="xs" color="red.500">
            {error}
          </Text>
        )}
      </Box>

      {mode === 'register' && (
        <Box>
          <Text fontWeight="700" mb={2} color="text.secondary">
            Xác nhận mật khẩu
          </Text>
          <InputGroup>
            <Input
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => onConfirmPasswordChange(e.target.value)}
              placeholder="Nhập lại mật khẩu"
              bg="white"
              borderColor="border.muted"
              pr="42px"
            />
            <InputRightElement h="full" pr={1}>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setShowConfirmPassword((v) => !v)}
                aria-label={showConfirmPassword ? 'Ẩn xác nhận mật khẩu' : 'Hiện xác nhận mật khẩu'}
              >
                {showConfirmPassword ? <ViewOffIcon /> : <ViewIcon />}
              </Button>
            </InputRightElement>
          </InputGroup>
        </Box>
      )}

      <Button
        bg="red.600"
        color="white"
        _hover={{ bg: 'red.700' }}
        height="44px"
        fontWeight="800"
        onClick={onSubmit}
        isLoading={loading}
      >
        {mode === 'login' ? 'Đăng nhập' : 'Đăng ký'}
      </Button>
    </>
  )
}

