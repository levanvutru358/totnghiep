import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

export interface AppNotification {
  id: number
  type: string
  title: string
  body: string | null
  referenceType: string | null
  referenceId: number | null
  isRead: boolean
  createdAt: string
}

export interface NotificationsListResponse {
  items: AppNotification[]
  total: number
  page: number
  totalPages: number
}

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const notificationsApi = {
  list: async (params?: { page?: number; limit?: number }): Promise<NotificationsListResponse> => {
    const response = await http.get<ApiResponse<NotificationsListResponse>>(
      `/notifications${buildQuery(params)}`,
    )
    return response.data.data
  },

  /** Tải toàn bộ thông báo (lặp phân trang server, tối đa 50/trang). */
  listAll: async (): Promise<AppNotification[]> => {
    const limit = 50
    let page = 1
    const all: AppNotification[] = []
    while (page <= 100) {
      const chunk = await notificationsApi.list({ page, limit })
      all.push(...chunk.items)
      if (page >= chunk.totalPages) break
      page += 1
    }
    return all
  },

  unreadCount: async (): Promise<number> => {
    const response = await http.get<ApiResponse<{ unread: number }>>('/notifications/unread-count')
    return response.data.data.unread
  },

  markRead: async (id: number): Promise<void> => {
    await http.patch(`/notifications/${id}/read`, {})
  },

  markAllRead: async (): Promise<void> => {
    await http.patch('/notifications/read-all', {})
  },
}
