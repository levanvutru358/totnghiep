export type PromotionDiscountType = 'FIXED' | 'PERCENT' | 'FREE_SHIPPING'

export interface PromotionCode {
  id: number
  code: string
  name: string
  description: string | null
  discountType: PromotionDiscountType
  discountValue: number
  maxDiscountAmount: number | null
  minOrderAmount: number
  usageLimit: number | null
  usageLimitPerUser: number | null
  usedCount: number
  startsAt: string | null
  endsAt: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface PromotionFilters {
  search?: string
  isActive?: boolean
  page?: number
  limit?: number
}

export interface PromotionListResponse {
  items: PromotionCode[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface PromotionFormInput {
  code: string
  name: string
  description?: string
  discountType: PromotionDiscountType
  discountValue: number
  maxDiscountAmount?: number | null
  minOrderAmount: number
  usageLimit?: number | null
  usageLimitPerUser?: number | null
  startsAt?: string | null
  endsAt?: string | null
  isActive: boolean
}
