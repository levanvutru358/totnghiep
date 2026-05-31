import {
  Badge,
  Box,
  Button,
  HStack,
  Heading,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { LoginRequiredPrompt } from '../../auth/components/login-required-prompt'
import { commerceApi } from '../../commerce/services/commerce.api'
import { dispatchNotificationsUpdated } from '../lib/notifications-events'
import { notificationsApi, type AppNotification } from '../services/notifications.api'

export const NotificationsPage = () => {
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [markingAll, setMarkingAll] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!commerceApi.hasServerToken()) {
      setItems([])
      setUnreadCount(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const [all, unread] = await Promise.all([
        notificationsApi.listAll(),
        notificationsApi.unreadCount(),
      ])
      setItems(all)
      setUnreadCount(unread)
    } catch (err) {
      setItems([])
      setUnreadCount(0)
      setError(err instanceof Error ? err.message : 'Không tải được thông báo')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const markRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id)
      setItems((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      dispatchNotificationsUpdated()
    } catch {
      // ignore
    }
  }

  const markAll = async () => {
    if (unreadCount <= 0) return
    setMarkingAll(true)
    setError(null)
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      dispatchNotificationsUpdated()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đánh dấu được tất cả đã đọc')
    } finally {
      setMarkingAll(false)
    }
  }

  if (!commerceApi.hasServerToken()) {
    return (
      <LoginRequiredPrompt
        description="Đăng nhập để xem thông báo."
        onSuccess={() => void load()}
      />
    )
  }

  return (
    <VStack align="stretch" spacing={4} maxW="2xl" mx="auto" py={4}>
      <HStack justify="space-between" flexWrap="wrap" gap={2}>
        <Box>
          <Heading size="md">Thông báo</Heading>
          {items.length > 0 && (
            <Text fontSize="sm" color="text.secondary" mt={1}>
              {items.length} thông báo
              {unreadCount > 0 ? ` · ${unreadCount} chưa đọc` : ' · Đã đọc hết'}
            </Text>
          )}
        </Box>
        <Button
          size="sm"
          colorScheme="pink"
          bg="brand.600"
          color="white"
          _hover={{ bg: 'brand.700' }}
          isDisabled={unreadCount <= 0}
          isLoading={markingAll}
          onClick={() => void markAll()}
        >
          Đọc tất cả
        </Button>
      </HStack>

      <Text fontSize="sm" color="text.secondary">
        <Link to={ROUTES.ACCOUNT_PROFILE}>← Tài khoản</Link>
      </Text>

      {error && (
        <Box bg="red.50" borderWidth="1px" borderColor="red.100" borderRadius="md" px={3} py={2}>
          <Text fontSize="sm" color="red.600">
            {error}
          </Text>
        </Box>
      )}

      {loading && (
        <HStack justify="center" py={8}>
          <Spinner />
        </HStack>
      )}

      {!loading && items.length === 0 && !error && (
        <Text color="text.secondary">Chưa có thông báo.</Text>
      )}

      {items.map((n) => (
        <Box
          key={n.id}
          borderWidth="1px"
          borderRadius="lg"
          p={4}
          bg={n.isRead ? 'white' : 'orange.50'}
          borderColor={n.isRead ? 'border.subtle' : 'orange.200'}
          cursor={n.isRead ? 'default' : 'pointer'}
          onClick={() => !n.isRead && void markRead(n.id)}
        >
          <HStack justify="space-between" mb={1}>
            <Text fontWeight="700" fontSize="sm">
              {n.title}
            </Text>
            {!n.isRead && <Badge colorScheme="red">Mới</Badge>}
          </HStack>
          {n.body && (
            <Text fontSize="sm" color="text.secondary">
              {n.body}
            </Text>
          )}
          <Text fontSize="xs" color="gray.400" mt={2}>
            {new Date(n.createdAt).toLocaleString('vi-VN')}
          </Text>
        </Box>
      ))}
    </VStack>
  )
}
