export type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'PENDING'

export interface AdminComment {
  id: number
  productId: number
  productName?: string
  userId: number
  userName: string
  parentId: number | null
  content: string
  status: CommentStatus
  likeCount: number
  images?: Array<{ id: number; url: string }>
  createdAt: string
  updatedAt: string
}

export interface CommentsListResponse {
  items: AdminComment[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CommentFilters {
  page?: number
  limit?: number
}
