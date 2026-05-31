import { BellIcon } from '@chakra-ui/icons'
import {
  Box,
  Button,
  HStack,
  IconButton,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Spinner,
  Text,
} from '@chakra-ui/react'
import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../../app/router/route-names'
import { useAuthModal } from '../../auth/context/auth-modal-context'
import { commerceApi } from '../../commerce/services/commerce.api'
import {
  dispatchNotificationsUpdated,
  NOTIFICATIONS_UPDATED_EVENT,
} from '../lib/notifications-events'
import { notificationsApi, type AppNotification } from '../services/notifications.api'

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

export const NotificationBell = () => {
  const { currentUser, openAuthModal } = useAuthModal()
  const [items, setItems] = useState<AppNotification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [markingAll, setMarkingAll] = useState(false)

  const load = useCallback(async () => {
    if (!commerceApi.hasServerToken() || !currentUser) {
      setItems([])
      setUnreadCount(0)
      return
    }
    setLoading(true)
    try {
      const [data, unread] = await Promise.all([
        notificationsApi.list({ page: 1, limit: 30 }),
        notificationsApi.unreadCount(),
      ])
      setItems(data.items)
      setUnreadCount(unread)
    } catch {
      setItems([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [currentUser])

  useEffect(() => {
    void load()
    if (!currentUser) return undefined

    const timer = window.setInterval(() => void load(), 45_000)
    const onUpdated = () => void load()
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated)
    return () => {
      window.clearInterval(timer)
      window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, onUpdated)
    }
  }, [load, currentUser])

  const handleOpen = () => {
    if (!currentUser) {
      openAuthModal()
      return
    }
    void load()
  }

  const handleMarkAllRead = async (e: MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (unreadCount <= 0) return
    setMarkingAll(true)
    try {
      await notificationsApi.markAllRead()
      setItems((prev) => prev.map((n) => ({ ...n, isRead: true })))
      setUnreadCount(0)
      dispatchNotificationsUpdated()
    } catch {
      // ignore
    } finally {
      setMarkingAll(false)
    }
  }

  const handleItemClick = async (item: AppNotification) => {
    if (item.isRead) return
    try {
      await notificationsApi.markRead(item.id)
      setItems((prev) => prev.map((n) => (n.id === item.id ? { ...n, isRead: true } : n)))
      setUnreadCount((c) => Math.max(0, c - 1))
      dispatchNotificationsUpdated()
    } catch {
      // ignore
    }
  }

  const hasUnread = unreadCount > 0

  return (
    <Box position="relative" display="inline-flex">
      {hasUnread && (
        <Box
          position="absolute"
          top="6px"
          right="6px"
          w="8px"
          h="8px"
          borderRadius="full"
          bg="red.500"
          borderWidth="2px"
          borderColor="white"
          pointerEvents="none"
          zIndex={2}
        />
      )}
      <Menu placement="bottom-end" closeOnSelect={false} onOpen={handleOpen}>
        <MenuButton
          as={IconButton}
          aria-label="Thông báo"
          icon={<BellIcon boxSize={4} />}
          variant="ghost"
          size="sm"
        />

        <MenuList maxW="320px" maxH="380px" overflowY="auto" zIndex={30}>
          <HStack px={3} py={2} justify="space-between" align="center">
            <Text fontWeight="800" fontSize="sm">
              Thông báo
              {unreadCount > 0 ? ` (${unreadCount})` : ''}
            </Text>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="pink"
              isDisabled={unreadCount <= 0}
              isLoading={markingAll}
              onClick={(e) => void handleMarkAllRead(e)}
            >
              Đọc tất cả
            </Button>
          </HStack>
          <MenuDivider m={0} />

          {!currentUser && (
            <Box px={3} py={4}>
              <Text fontSize="sm" color="text.secondary">
                Đăng nhập để xem thông báo.
              </Text>
            </Box>
          )}

          {currentUser && loading && items.length === 0 && (
            <HStack justify="center" py={6}>
              <Spinner size="sm" />
            </HStack>
          )}

          {currentUser && !loading && items.length === 0 && (
            <Box px={3} py={4}>
              <Text fontSize="sm" color="text.secondary">
                Chưa có thông báo.
              </Text>
            </Box>
          )}

          {currentUser &&
            items.map((item) => (
              <MenuItem
                key={item.id}
                onClick={() => void handleItemClick(item)}
                bg={item.isRead ? 'transparent' : 'orange.50'}
                flexDirection="column"
                alignItems="flex-start"
                whiteSpace="normal"
                py={2}
              >
                <HStack w="full" justify="space-between" align="start">
                  <Text fontSize="sm" fontWeight={item.isRead ? '600' : '800'} noOfLines={2}>
                    {item.title}
                  </Text>
                  {!item.isRead && (
                    <Box w="6px" h="6px" borderRadius="full" bg="red.500" flexShrink={0} mt={1} />
                  )}
                </HStack>
                {item.body && (
                  <Text fontSize="xs" color="text.secondary" noOfLines={2} mt={0.5}>
                    {item.body}
                  </Text>
                )}
                <Text fontSize="xs" color="gray.400" mt={1}>
                  {formatTime(item.createdAt)}
                </Text>
              </MenuItem>
            ))}
          <MenuDivider m={0} />
          <MenuItem as={Link} to={ROUTES.ACCOUNT_NOTIFICATIONS} fontSize="sm" fontWeight="700" color="brand.600">
            Xem tất cả thông báo
          </MenuItem>
        </MenuList>
      </Menu>
    </Box>
  )
}
