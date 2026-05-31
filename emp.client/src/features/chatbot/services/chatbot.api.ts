const fallbackChatbotUrl = 'http://localhost:8090'
const chatbotBase = (import.meta.env.VITE_CHATBOT_URL as string | undefined) || fallbackChatbotUrl

const resolveChatbotUrl = (path: string) =>
  `${chatbotBase.replace(/\/+$/, '')}${path.startsWith('/') ? path : `/${path}`}`

export const getChatbotAccessToken = () =>
  localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token')

export interface ChatbotHealth {
  status: string
  database: boolean
  llmEnabled: boolean
  llmProvider: string
  geminiReachable?: boolean | null
  geminiError?: string | null
  authRequired?: boolean
}

export interface ChatbotMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  status?: string
  created_at?: string
}

export interface ChatbotSendResponse {
  conversation_id: string
  messages: ChatbotMessage[]
  intent?: string
  suggestions?: string[]
}

const parseApiError = (data: Record<string, unknown>, status: number): string => {
  const detail = data.detail
  if (detail && typeof detail === 'object' && !Array.isArray(detail)) {
    const obj = detail as Record<string, unknown>
    if (typeof obj.message === 'string') return obj.message
    if (typeof obj.errorCode === 'string') return obj.errorCode
  }
  if (typeof detail === 'string') return detail
  if (typeof data.message === 'string') return data.message
  if (typeof data.errorCode === 'string') return data.errorCode
  return `CHATBOT_HTTP_${status}`
}

export const chatbotApi = {
  async getHealth(): Promise<ChatbotHealth> {
    const response = await fetch(resolveChatbotUrl('/health'))
    const raw = await response.text()
    const data = raw ? (JSON.parse(raw) as ChatbotHealth) : ({} as ChatbotHealth)
    if (!response.ok) {
      throw new Error('CHATBOT_HEALTH_FAILED')
    }
    return data
  },

  async loadMessages(conversationId: string): Promise<ChatbotMessage[]> {
    const token = getChatbotAccessToken()
    const response = await fetch(
      resolveChatbotUrl(`/chat/messages?conversation_id=${encodeURIComponent(conversationId)}`),
      {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    )
    const raw = await response.text()
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    if (!response.ok) {
      throw new Error(parseApiError(data, response.status))
    }
    const items = data.items
    return Array.isArray(items) ? (items as ChatbotMessage[]) : []
  },

  async sendMessage(input: { conversationId?: string; content: string }): Promise<ChatbotSendResponse> {
    const token = getChatbotAccessToken()
    const response = await fetch(resolveChatbotUrl('/chat/messages'), {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        conversation_id: input.conversationId ?? null,
        content: input.content,
      }),
    })

    const raw = await response.text()
    const data = raw ? (JSON.parse(raw) as Record<string, unknown>) : {}
    if (!response.ok) {
      throw new Error(parseApiError(data, response.status))
    }
    return data as unknown as ChatbotSendResponse
  },
}
