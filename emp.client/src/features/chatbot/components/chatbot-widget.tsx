import { ChatIcon, CloseIcon } from '@chakra-ui/icons'
import {
  Badge,
  Box,
  Button,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
} from '@chakra-ui/react'
import { useEffect, useMemo, useState } from 'react'
import { useAuthModal } from '../../auth/context/auth-modal-context'
import {
  chatbotApi,
  getChatbotAccessToken,
  type ChatbotMessage,
} from '../services/chatbot.api'
import { DEFAULT_SHOE_SUGGESTIONS, filterShoeSuggestions } from '../lib/shoe-suggestions'
import { ChatMessageContent } from './chat-message-content'

const CONVERSATION_STORAGE_KEY = 'emp_chatbot_conversation_id'

type UiMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const initialGreeting: UiMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Xin chào! Mình có thể giúp bạn tìm giày, tra cứu đơn hàng và giải đáp nhanh về size, giao hàng.',
}

const requiresLoginForPurchase = (text: string) => {
  const normalized = text.toLowerCase()
  return /(mua|dat hang|đặt hàng|thanh toan|thanh toán|checkout|chot don|chốt đơn)/i.test(
    normalized,
  )
}

const requiresLoginForOrderLookup = (text: string) => {
  const normalized = text.toLowerCase()
  return (
    /ORD-\d/i.test(text) ||
    /(đơn hàng|don hang|tra cứu đơn|tra cuu don|mã đơn|ma don|theo dõi đơn)/i.test(normalized)
  )
}

const readStoredConversationId = () => {
  try {
    return localStorage.getItem(CONVERSATION_STORAGE_KEY) ?? undefined
  } catch {
    return undefined
  }
}

export const ChatbotWidget = () => {
  const { openAuthModal, currentUser } = useAuthModal()
  const [isOpen, setIsOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(readStoredConversationId)
  const [draft, setDraft] = useState('')
  const [loading, setLoading] = useState(false)
  const [messages, setMessages] = useState<UiMessage[]>([initialGreeting])
  const [suggestions, setSuggestions] = useState<string[]>([...DEFAULT_SHOE_SUGGESTIONS])
  const [authRequired, setAuthRequired] = useState(false)
  const [geminiReady, setGeminiReady] = useState<boolean | null>(null)

  const hasToken = useMemo(
    () => Boolean(getChatbotAccessToken()) || Boolean(currentUser),
    [currentUser, isOpen],
  )

  useEffect(() => {
    if (!isOpen) return
    let cancelled = false
    void (async () => {
      try {
        const health = await chatbotApi.getHealth()
        if (cancelled) return
        setAuthRequired(Boolean(health.authRequired))
        setGeminiReady(health.llmEnabled ? Boolean(health.geminiReachable) : true)
        if (health.authRequired && !getChatbotAccessToken()) {
          setMessages([
            {
              id: 'auth-required',
              role: 'assistant',
              content:
                'Chatbot yêu cầu **đăng nhập**. Bạn đăng nhập để mình hỗ trợ tìm sản phẩm và tra cứu đơn nhé.',
            },
          ])
        }
      } catch {
        if (!cancelled) setGeminiReady(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen])

  useEffect(() => {
    try {
      if (conversationId) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId)
      } else {
        localStorage.removeItem(CONVERSATION_STORAGE_KEY)
      }
    } catch {
      /* ignore */
    }
  }, [conversationId])

  useEffect(() => {
    if (!isOpen || !conversationId) return
    let cancelled = false
    void (async () => {
      try {
        const items = await chatbotApi.loadMessages(conversationId)
        if (cancelled || !items.length) return
        setMessages([
          initialGreeting,
          ...items
            .filter(
              (m) =>
                m.status !== 'revoked' &&
                (m.role === 'user' || m.role === 'assistant'),
            )
            .map((m) => ({
              id: m.id || `${m.role}-${Math.random().toString(36).slice(2)}`,
              role: m.role,
              content: m.content,
            })),
        ])
      } catch {
        /* giữ tin nhắn hiện tại nếu không tải được */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isOpen, conversationId])

  const canSend = useMemo(
    () => draft.trim().length > 0 && !loading && (!authRequired || hasToken),
    [draft, loading, authRequired, hasToken],
  )

  const pushMessages = (newMessages: ChatbotMessage[]) => {
    setMessages((prev) => {
      const next = [...prev]
      for (const msg of newMessages) {
        const id = msg.id || `${msg.role}-${Math.random().toString(36).slice(2)}`
        next.push({ id, role: msg.role, content: msg.content })
      }
      return next
    })
  }

  const startNewChat = () => {
    setConversationId(undefined)
    setMessages([initialGreeting])
    setSuggestions([...DEFAULT_SHOE_SUGGESTIONS])
  }

  const sendMessage = async (text: string) => {
    const content = text.trim()
    if (!content || loading) return

    if (authRequired && !hasToken) {
      openAuthModal()
      return
    }
    if (!hasToken && requiresLoginForPurchase(content)) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content },
        {
          id: `login-${Date.now()}`,
          role: 'assistant',
          content:
            'Bạn cần đăng nhập để đặt mua. Mình mở hộp thoại đăng nhập cho bạn ngay nhé.',
        },
      ])
      openAuthModal()
      setDraft('')
      return
    }

    if (!hasToken && requiresLoginForOrderLookup(content)) {
      setMessages((prev) => [
        ...prev,
        { id: `u-${Date.now()}`, role: 'user', content },
        {
          id: `login-order-${Date.now()}`,
          role: 'assistant',
          content:
            'Tra cứu đơn hàng cần đăng nhập tài khoản đã đặt hàng. Mình mở hộp thoại đăng nhập cho bạn.',
        },
      ])
      openAuthModal()
      setDraft('')
      return
    }

    setLoading(true)
    setDraft('')

    setMessages((prev) => [
      ...prev,
      { id: `u-${Date.now()}`, role: 'user', content },
    ])

    try {
      const res = await chatbotApi.sendMessage({ conversationId, content })
      if (res.conversation_id) setConversationId(res.conversation_id)
      if (Array.isArray(res.messages)) {
        const assistantOnly = res.messages.filter((m) => m.role === 'assistant')
        pushMessages(assistantOnly)
      }
      if (Array.isArray(res.suggestions) && res.suggestions.length) {
        setSuggestions(filterShoeSuggestions(res.suggestions))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Không gửi được tin nhắn'
      if (/unauthorized|token|401|invalid|missing bearer/i.test(message)) {
        openAuthModal()
      }
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: 'assistant',
          content:
            geminiReady === false
              ? 'AI tạm thời không khả dụng — mình vẫn trả lời theo FAQ. Bạn thử lại sau hoặc hỏi câu khác.'
              : `Rất tiếc, chưa gửi được tin nhắn (${message}). Vui lòng thử lại.`,
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box position="fixed" right={4} bottom={4} zIndex={40}>
      {!isOpen ? (
        <IconButton
          aria-label="Open chatbot"
          icon={<ChatIcon />}
          colorScheme="pink"
          borderRadius="full"
          boxSize={14}
          shadow="lg"
          onClick={() => setIsOpen(true)}
        />
      ) : (
        <Box w={{ base: 'calc(100vw - 24px)', sm: '360px' }} maxW="360px" bg="white" borderWidth="1px" borderColor="border.subtle" borderRadius="xl" shadow="2xl" overflow="hidden">
          <HStack justify="space-between" px={3} py={2} bg="pink.600" color="white">
            <HStack spacing={2}>
              <ChatIcon />
              <Text fontWeight="700" fontSize="sm">Trợ lý DTT Shop</Text>
              {conversationId && <Badge colorScheme="blackAlpha">Đang trò chuyện</Badge>}
            </HStack>
            <HStack spacing={0}>
              {conversationId && (
                <Button
                  size="xs"
                  variant="ghost"
                  color="white"
                  _hover={{ bg: 'whiteAlpha.300' }}
                  onClick={startNewChat}
                >
                  Mới
                </Button>
              )}
              <IconButton
                aria-label="Close chatbot"
                icon={<CloseIcon boxSize={2.5} />}
                size="sm"
                variant="ghost"
                color="white"
                _hover={{ bg: 'whiteAlpha.300' }}
                onClick={() => setIsOpen(false)}
              />
            </HStack>
          </HStack>

          <VStack align="stretch" spacing={2} p={3} bg="gray.50" h="360px" overflowY="auto">
            {messages.map((msg) => (
              <Box key={msg.id} alignSelf={msg.role === 'user' ? 'flex-end' : 'flex-start'} maxW="88%">
                <Box
                  bg={msg.role === 'user' ? 'pink.500' : 'white'}
                  color={msg.role === 'user' ? 'white' : 'gray.800'}
                  borderWidth={msg.role === 'user' ? 0 : '1px'}
                  borderColor="border.subtle"
                  px={3}
                  py={2}
                  borderRadius="lg"
                >
                  <ChatMessageContent content={msg.content} isUser={msg.role === 'user'} />
                </Box>
              </Box>
            ))}
            {loading && (
              <HStack>
                <Spinner size="xs" />
                <Text fontSize="xs" color="text.secondary">Đang trả lời...</Text>
              </HStack>
            )}
          </VStack>

          <Box px={3} py={2} borderTopWidth="1px" borderColor="border.subtle">
            <HStack spacing={2} mb={2} flexWrap="wrap">
              {suggestions.slice(0, 3).map((s) => (
                <Button key={s} size="xs" variant="outline" onClick={() => void sendMessage(s)}>
                  {s}
                </Button>
              ))}
            </HStack>
            <HStack>
              <Input
                size="sm"
                placeholder="Nhập câu hỏi..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    void sendMessage(draft)
                  }
                }}
              />
              <Button size="sm" colorScheme="pink" isDisabled={!canSend} isLoading={loading} onClick={() => void sendMessage(draft)}>
                Gửi
              </Button>
            </HStack>
          </Box>
        </Box>
      )}
    </Box>
  )
}
