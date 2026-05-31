export type MarketingHomeSectionCode = 'TOP_DEAL' | 'FLASH_SALE' | 'BEST_SELLER' | 'SUGGESTED'

export type MarketingBanner = {
  id: number
  placement: string
  title: string
  description: string | null
  imageUrl: string
  linkUrl: string
  ctaLabel: string | null
  sortOrder: number
  isActive: boolean
  startsAt: string | null
  endsAt: string | null
}

export type MarketingBannerFormInput = {
  title: string
  description: string
  imageUrl: string
  linkUrl: string
  ctaLabel: string
  sortOrder: number
  isActive: boolean
  startsAt: string
  endsAt: string
}

export type MarketingHomeSection = {
  code: MarketingHomeSectionCode
  title: string
  subtitle: string | null
  badgeLabel: string | null
  linkUrl: string
  isActive: boolean
  sortOrder: number
}

export type MarketingHomeSectionFormInput = {
  title: string
  subtitle: string
  badgeLabel: string
  linkUrl: string
  isActive: boolean
  sortOrder: number
}

export type MarketingSectionProduct = {
  id: number
  section: MarketingHomeSectionCode
  productId: number
  badgeLabel: string | null
  /** % giảm thêm trên giá bán hiện tại (0–100), chỉ áp dụng trên trang chủ */
  discountPercent: number | null
  sortOrder: number
  isActive: boolean
  endsAt: string | null
  product: {
    id: number
    name: string
    slug: string
    thumbnailUrl: string | null
    basePrice: number
    salePrice: number | null
    brandName: string
    categoryName: string
  } | null
}

export type MarketingSectionProductFormInput = {
  productId: number | ''
  badgeLabel: string
  discountPercent: number | ''
  sortOrder: number
  isActive: boolean
  endsAt: string
}

/** @deprecated alias */
export type MarketingFlashSaleItem = MarketingSectionProduct
export type MarketingFlashSaleFormInput = MarketingSectionProductFormInput
