import {
  catalogSubtotalMeetsPromotionMin,
  formatCatalogVnd,
  formatPromotionVnd,
} from '../../../lib/money-vnd'
import type { ShopPromotion } from '../../promotions/services/promotions.api'

export const isCheckoutPromotionEligible = (subtotalCatalog: number, promotion: ShopPromotion) =>
  catalogSubtotalMeetsPromotionMin(subtotalCatalog, promotion.minOrderAmount)

export const isPromotionAlreadyUsed = (promotion: ShopPromotion) => Boolean(promotion.alreadyUsed)

export const isPromotionSelectable = (subtotalCatalog: number, promotion: ShopPromotion) =>
  !isPromotionAlreadyUsed(promotion) && isCheckoutPromotionEligible(subtotalCatalog, promotion)

export const promotionMinOrderHint = (minOrderAmountVnd: number) =>
  `Đơn từ ${formatPromotionVnd(minOrderAmountVnd)}`

export const promotionDisabledHint = (
  subtotalCatalog: number,
  promotion: ShopPromotion,
): string | null => {
  if (isPromotionAlreadyUsed(promotion)) return 'Đã dùng'
  if (!isCheckoutPromotionEligible(subtotalCatalog, promotion)) {
    return promotionMinOrderHint(promotion.minOrderAmount)
  }
  return null
}

export const formatCheckoutSubtotal = formatCatalogVnd

export const mapPromotionApplyError = (error: unknown): string => {
  const message = error instanceof Error ? error.message : ''
  const code = message.split(':')[0]
  if (code === 'PROMOTION_USER_LIMIT_REACHED') {
    return 'Bạn đã dùng hết lượt cho mã này.'
  }
  if (code === 'PROMOTION_MIN_ORDER_NOT_MET' || message.includes('min order')) {
    return 'Đơn chưa đủ giá trị tối thiểu để dùng mã này.'
  }
  if (message) return message
  return 'Không thể áp dụng mã khuyến mãi.'
}
