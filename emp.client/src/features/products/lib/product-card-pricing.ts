import type { ProductItem } from '../types/product.type'

export type ProductCardPricing = {
  displayPrice: number
  compareAtPrice: number | null
  discountPercent: number | null
  imageBadge: string | null
}

export const getProductCardPricing = (product: ProductItem): ProductCardPricing => {
  const marketing = product.marketingOffer
  const displayPrice = marketing?.displayPrice ?? product.price
  const compareAtPrice =
    marketing != null
      ? marketing.catalogPrice > displayPrice
        ? marketing.catalogPrice
        : null
      : product.originalPrice != null && product.originalPrice > displayPrice
        ? product.originalPrice
        : null

  const discountPercent =
    marketing != null
      ? Math.round(marketing.discountPercent)
      : compareAtPrice != null
        ? Math.round((1 - displayPrice / compareAtPrice) * 100)
        : null

  const imageBadge =
    marketing?.badgeLabel?.trim() ||
    (discountPercent != null && discountPercent > 0 ? `-${discountPercent}%` : null)

  return {
    displayPrice,
    compareAtPrice,
    discountPercent: discountPercent != null && discountPercent > 0 ? discountPercent : null,
    imageBadge,
  }
}
