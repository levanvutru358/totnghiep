import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type { ProductReview, ReviewFilters, ReviewsListResponse } from '../types/review.type'

export const reviewsApi = {
  list: async (filters: ReviewFilters = {}): Promise<ReviewsListResponse> => {
    const params: Record<string, string | number> = { page: filters.page ?? 1, limit: filters.limit ?? 20 }
    if (filters.search?.trim()) params.search = filters.search.trim()
    if (filters.status) params.status = filters.status.toLowerCase()
    if (filters.rating) params.rating = filters.rating
    if (filters.productId) params.productId = Number(filters.productId)
    const response = await http.get<ApiResponse<ReviewsListResponse>>('/admin/reviews', { params })
    return response.data.data
  },

  statistics: async () => {
    const response = await http.get<ApiResponse<{ total: number; pending: number; approved: number; rejected: number; hidden: number }>>(
      '/admin/reviews/statistics',
    )
    return response.data.data
  },

  hide: async (reviewId: number, adminNote?: string) => {
    const response = await http.patch<ApiResponse<ProductReview>>(`/admin/reviews/${reviewId}/hide`, { adminNote })
    return response.data.data
  },

  remove: async (reviewId: number): Promise<void> => {
    await http.delete(`/admin/reviews/${reviewId}`)
  },
}
