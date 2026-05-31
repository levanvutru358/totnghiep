import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

export type ReviewSort = 'newest' | 'oldest' | 'rating_high' | 'rating_low'

export interface ProductReview {
  id: number
  productId: number
  productName?: string
  userId: number
  userName: string
  rating: number
  title: string | null
  content: string
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN'
  verified: boolean
  likeCount: number
  liked: boolean
  images: Array<{ id: number; url: string; uploadId?: number | null }>
  createdAt: string
  updatedAt: string
}

export interface ReviewStatistics {
  average: number
  total: number
  star: Record<1 | 2 | 3 | 4 | 5, number>
}

export interface ReviewsListResponse {
  items: ProductReview[]
  total: number
  page: number
  totalPages: number
}

const buildQuery = (params?: Record<string, string | number | boolean | undefined>) => {
  if (!params) return ''
  const q = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') q.set(key, String(value))
  })
  const s = q.toString()
  return s ? `?${s}` : ''
}

export const reviewsApi = {
  getStatistics: async (productId: string | number): Promise<ReviewStatistics> => {
    const response = await http.get<ApiResponse<ReviewStatistics>>(
      `/products/${encodeURIComponent(String(productId))}/reviews/statistics`,
    )
    return response.data.data
  },

  listByProduct: async (
    productId: string | number,
    params?: { page?: number; limit?: number; rating?: number; sort?: ReviewSort; hasImage?: boolean; verified?: boolean },
  ): Promise<ReviewsListResponse> => {
    const response = await http.get<ApiResponse<ReviewsListResponse>>(
      `/products/${encodeURIComponent(String(productId))}/reviews${buildQuery(params)}`,
    )
    return response.data.data
  },

  create: async (payload: {
    productId: number
    rating: number
    title?: string
    content: string
    images?: Array<number | string>
    orderId?: number
  }): Promise<ProductReview> => {
    const response = await http.post<ApiResponse<ProductReview>>('/reviews', payload)
    return response.data.data
  },

  update: async (
    reviewId: number,
    payload: { rating?: number; content?: string; title?: string; images?: Array<number | string> },
  ): Promise<ProductReview> => {
    const response = await http.put<ApiResponse<ProductReview>>(`/reviews/${reviewId}`, payload)
    return response.data.data
  },

  remove: async (reviewId: number): Promise<void> => {
    await http.delete(`/reviews/${reviewId}`)
  },

  deleteImage: async (reviewId: number, imageId: number): Promise<void> => {
    await http.delete(`/reviews/${reviewId}/images/${imageId}`)
  },

  like: async (reviewId: number): Promise<ProductReview> => {
    const response = await http.post<ApiResponse<ProductReview>>(`/reviews/${reviewId}/like`, {})
    return response.data.data
  },

  unlike: async (reviewId: number): Promise<ProductReview> => {
    const response = await http.delete<ApiResponse<ProductReview>>(`/reviews/${reviewId}/like`)
    return response.data.data
  },

  uploadImages: async (files: File[]): Promise<Array<{ id: number; url: string }>> => {
    const form = new FormData()
    files.forEach((f) => form.append('images', f))
    const token = localStorage.getItem('access_token') ?? localStorage.getItem('client_access_token')
    const base = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'
    const res = await fetch(`${base}/reviews/upload`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      credentials: 'include',
      body: form,
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.message || 'Upload failed')
    return json.data.images as Array<{ id: number; url: string }>
  },

  listMine: async (params?: { page?: number; limit?: number }): Promise<ReviewsListResponse> => {
    const response = await http.get<ApiResponse<ReviewsListResponse>>(`/users/me/reviews${buildQuery(params)}`)
    return response.data.data
  },
}
