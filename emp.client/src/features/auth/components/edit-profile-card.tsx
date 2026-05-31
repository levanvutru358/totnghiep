import { Box, Button, FormControl, FormLabel, HStack, Input, Text, VStack } from '@chakra-ui/react'
import { useEffect, useState } from 'react'
import { mapAuthErrorMessage } from '../lib/auth-password-messages'
import { clientAuthApi, type ClientMe } from '../services/client-auth.api'

export interface EditProfileCardProps {
  user: ClientMe | null
  onProfileUpdated?: (user: ClientMe) => void
  embedded?: boolean
}

export const EditProfileCard = ({ user, onProfileUpdated, embedded }: EditProfileCardProps) => {
  const [fullName, setFullName] = useState(user?.fullName ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    setFullName(user?.fullName ?? '')
  }, [user?.fullName, user?.id])

  const handleSubmit = async () => {
    setError(null)
    setSuccess(null)

    const trimmed = fullName.trim()
    if (trimmed.length > 120) {
      setError('Tên hiển thị tối đa 120 ký tự.')
      return
    }

    try {
      setLoading(true)
      const updated = await clientAuthApi.updateProfile({ fullName: trimmed || null })
      localStorage.setItem('client_user', JSON.stringify(updated))
      setSuccess('Đã lưu.')
      onProfileUpdated?.(updated)
    } catch (err) {
      setError(mapAuthErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const form = (
    <VStack align="stretch" spacing={4}>
      <HStack align={{ base: 'stretch', md: 'flex-end' }} spacing={4} flexDir={{ base: 'column', md: 'row' }}>
        <FormControl flex={1}>
          <FormLabel fontSize="md" mb={2} fontWeight="600">
            Email
          </FormLabel>
          <Input size="md" value={user?.email ?? ''} isReadOnly bg="gray.50" borderColor="border.muted" />
        </FormControl>
        <FormControl flex={1}>
          <FormLabel fontSize="md" mb={2} fontWeight="600">
            Tên hiển thị
          </FormLabel>
          <Input
            size="md"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Nhập tên của bạn"
            bg="white"
            borderColor="border.muted"
          />
        </FormControl>
        <Button
          size="md"
          height="48px"
          colorScheme="pink"
          bg="brand.600"
          _hover={{ bg: 'brand.700' }}
          onClick={() => void handleSubmit()}
          isLoading={loading}
          isDisabled={!user}
          flexShrink={0}
          minW={{ md: '120px' }}
          px={8}
        >
          Lưu
        </Button>
      </HStack>
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
    </VStack>
  )

  if (embedded) return form

  return (
    <Box bg="surface.card" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" p={{ base: 5, md: 7 }}>
      <Text fontWeight="800" fontSize="lg" mb={4}>
        Chỉnh sửa hồ sơ
      </Text>
      {form}
    </Box>
  )
}
