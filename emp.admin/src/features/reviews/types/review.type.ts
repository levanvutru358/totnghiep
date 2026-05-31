export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'HIDDEN'

export interface ProductReview {
  id: number
  productId: number
  productName?: string
  userId: number
  userName: string
  userEmail?: string
  rating: number
  title: string | null
  content: string
  status: ReviewStatus
  adminNote?: string | null
  verified: boolean
  likeCount: number
  images: Array<{ id: number; url: string }>
  createdAt: string
}

export interface ReviewFilters {
  search?: string
  status?: ReviewStatus | ''
  rating?: number
  productId?: string
  page?: number
  limit?: number
}

export interface ReviewsListResponse {
  items: ProductReview[]
  total: number
  page: number
  totalPages: number
}
