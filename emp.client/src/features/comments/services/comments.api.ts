import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

export interface ProductComment {
  id: number
  productId: number
  userId: number
  userName: string
  parentId: number | null
  content: string
  likeCount: number
  liked: boolean
  images: Array<{ id: number; url: string; uploadId?: number | null }>
  createdAt: string
  updatedAt?: string
}

export interface CommentsListResponse {
  items: ProductComment[]
  total: number
  page: number
  totalPages: number
}

const buildQuery = (params?: Record<string, string | number | undefined>) => {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const commentsApi = {
  listByProduct: async (productId: string | number, params?: { page?: number; limit?: number; sort?: 'newest' | 'oldest' }) => {
    const response = await http.get<ApiResponse<CommentsListResponse>>(
      `/products/${encodeURIComponent(String(productId))}/comments${buildQuery(params)}`,
    )
    return response.data.data
  },

  listReplies: async (commentId: number, params?: { page?: number; limit?: number }) => {
    const response = await http.get<ApiResponse<CommentsListResponse>>(
      `/comments/${commentId}/replies${buildQuery(params)}`,
    )
    const data = response.data.data
    return {
      ...data,
      items: data.items.filter((r) => r.parentId === commentId && r.id !== commentId),
    }
  },

  getDetail: async (commentId: number): Promise<ProductComment> => {
    const response = await http.get<ApiResponse<ProductComment>>(`/comments/${commentId}`)
    return response.data.data
  },

  create: async (payload: { productId: number; content: string; images?: Array<number | string> }) => {
    const response = await http.post<ApiResponse<ProductComment>>('/comments', payload)
    return response.data.data
  },

  reply: async (payload: { parentId: number; content: string; images?: Array<number | string> }) => {
    const response = await http.post<ApiResponse<ProductComment>>('/comments/reply', payload)
    return response.data.data
  },

  update: async (
    commentId: number,
    payload: { content: string; images?: Array<number | string> },
  ) => {
    const response = await http.put<ApiResponse<ProductComment>>(`/comments/${commentId}`, payload)
    return response.data.data
  },

  uploadImages: async (files: File[]): Promise<Array<{ id: number; url: string }>> => {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token')
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    const res = await fetch(`${base}/comments/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Upload failed')
    return json.data.images as Array<{ id: number; url: string }>
  },

  deleteImage: async (commentId: number, imageId: number): Promise<void> => {
    await http.delete(`/comments/${commentId}/images/${imageId}`)
  },

  remove: async (commentId: number) => {
    await http.delete(`/comments/${commentId}`)
  },

  like: async (commentId: number): Promise<ProductComment> => {
    const response = await http.post<ApiResponse<ProductComment>>(`/comments/${commentId}/like`, {})
    return response.data.data
  },

  unlike: async (commentId: number): Promise<ProductComment> => {
    const response = await http.delete<ApiResponse<ProductComment>>(`/comments/${commentId}/like`)
    return response.data.data
  },

  mention: async (commentId: number, username: string) => {
    await http.post('/comments/mention', { commentId, username })
  },
}
