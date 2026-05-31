import { toDisplayVnd } from '../features/products/lib/product-price'

export const formatCatalogVnd = (catalogAmount: number): string =>
  `${toDisplayVnd(catalogAmount).toLocaleString('vi-VN')}đ`

/** Khuyến mãi admin: VND đầy đủ, không nhân ×1000. */
export const formatPromotionVnd = (vnd: number): string =>
  `${Math.round(vnd).toLocaleString('vi-VN')}đ`

/** Số tiền bản ghi payment (VND đầy đủ) → hiển thị giống tổng đơn hàng. */
export const formatPaymentAmountVnd = (fullVndAmount: number): string =>
  formatCatalogVnd(promotionVndToCatalog(fullVndAmount))

/** Catalog (đang dùng cho giá/tạm tính) -> VND đầy đủ (đ). */
export const catalogToFullVnd = (catalogAmount: number): number => {
  if (!Number.isFinite(catalogAmount)) return 0
  return catalogAmount >= 100_000 ? Math.round(catalogAmount) : Math.round(catalogAmount * 1000)
}

/** VND đầy đủ (đ) -> Catalog (đơn vị đang dùng cho giá/tạm tính). */
export const promotionVndToCatalog = (vnd: number): number => {
  if (!Number.isFinite(vnd)) return 0
  return vnd >= 100_000 ? Math.round(vnd) : Math.round(vnd) / 1000
}

export const catalogSubtotalMeetsPromotionMin = (
  subtotalCatalog: number,
  minOrderAmountVnd: number,
): boolean => toDisplayVnd(subtotalCatalog) >= minOrderAmountVnd
