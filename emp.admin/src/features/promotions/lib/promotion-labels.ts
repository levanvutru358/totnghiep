import type { PromotionDiscountType } from '../types/promotion.type'

export const discountTypeLabel: Record<PromotionDiscountType, string> = {
  FIXED: 'Giảm số tiền cố định',
  PERCENT: 'Giảm theo phần trăm',
  FREE_SHIPPING: 'Miễn phí vận chuyển',
}

export const formatPromotionValue = (
  type: PromotionDiscountType,
  value: number,
  maxDiscount: number | null,
) => {
  if (type === 'FREE_SHIPPING') return 'Freeship'
  if (type === 'PERCENT') {
    const cap = maxDiscount != null ? ` (tối đa ${maxDiscount.toLocaleString('vi-VN')}đ)` : ''
    return `${value}%${cap}`
  }
  return `${value.toLocaleString('vi-VN')}đ`
}
