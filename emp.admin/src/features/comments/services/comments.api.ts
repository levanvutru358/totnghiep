import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type { AdminComment, CommentFilters, CommentsListResponse } from '../types/comment.type'

export const commentsApi = {
  list: async (filters: CommentFilters = {}): Promise<CommentsListResponse> => {
    const params = { page: filters.page ?? 1, limit: filters.limit ?? 20 }
    const response = await http.get<ApiResponse<CommentsListResponse>>('/admin/comments', { params })
    return response.data.data
  },

  hide: async (commentId: number) => {
    const response = await http.patch<ApiResponse<AdminComment>>(`/admin/comments/${commentId}/hide`)
    return response.data.data
  },

  show: async (commentId: number) => {
    const response = await http.patch<ApiResponse<AdminComment>>(`/admin/comments/${commentId}/show`)
    return response.data.data
  },

  remove: async (commentId: number): Promise<void> => {
    await http.delete(`/admin/comments/${commentId}`)
  },
}
