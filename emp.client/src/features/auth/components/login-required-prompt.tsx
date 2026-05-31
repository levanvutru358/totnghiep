import { Box, Button, Text, VStack } from '@chakra-ui/react'
import { useCallback, useEffect, useRef } from 'react'
import { commerceApi } from '../../commerce/services/commerce.api'
import { useAuthModal } from '../context/auth-modal-context'

export interface LoginRequiredPromptProps {
  description: string
  onSuccess: () => void | Promise<void>
  /** Mở modal đăng nhập ngay khi vào trang (mặc định: true) */
  autoOpen?: boolean
}

export const LoginRequiredPrompt = ({
  description,
  onSuccess,
  autoOpen = true,
}: LoginRequiredPromptProps) => {
  const { openAuthModal } = useAuthModal()
  const openedRef = useRef(false)
  const onSuccessRef = useRef(onSuccess)
  onSuccessRef.current = onSuccess

  const handleOpen = useCallback(() => {
    openAuthModal({ onSuccess: () => onSuccessRef.current() })
  }, [openAuthModal])

  useEffect(() => {
    if (!autoOpen || openedRef.current || commerceApi.hasServerToken()) return
    openedRef.current = true
    handleOpen()
  }, [autoOpen, handleOpen])

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="2xl" p={{ base: 6, md: 10 }}>
      <VStack align="stretch" spacing={4} textAlign="center">
        <Text color="text.secondary">{description}</Text>
        <Button
          alignSelf="center"
          bg="red.600"
          color="white"
          _hover={{ bg: 'red.700' }}
          onClick={handleOpen}
        >
          Đăng nhập
        </Button>
      </VStack>
    </Box>
  )
}
