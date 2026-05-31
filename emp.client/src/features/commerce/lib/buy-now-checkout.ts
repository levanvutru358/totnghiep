import type { CheckoutPreviewResponse } from '../services/commerce.api'
import {
  computeShippingFee,
  DEFAULT_SHIPPING_CONFIG,
  type ShippingFeeConfig,
} from '../../../lib/shipping-fee'

export interface BuyNowDraft {
  variantId: string
  quantity: number
  sku: string
  unitPrice: number
  productId: string
  productName: string
  productImage: string
  brand: string
  category: string
  size: string
  color: string
  stock: number
}

const STORAGE_KEY = 'emp.client.buy_now_draft'

export const saveBuyNowDraft = (draft: BuyNowDraft) => {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
}

export const readBuyNowDraft = (): BuyNowDraft | null => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as BuyNowDraft
  } catch {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
}

export const clearBuyNowDraft = () => {
  sessionStorage.removeItem(STORAGE_KEY)
}

export const buildBuyNowPreview = (
  draft: BuyNowDraft,
  quantity = draft.quantity,
  shippingConfig: ShippingFeeConfig = DEFAULT_SHIPPING_CONFIG,
): CheckoutPreviewResponse => {
  const qty = Math.min(Math.max(1, quantity), draft.stock)
  const subtotal = draft.unitPrice * qty
  const shippingFee = computeShippingFee(subtotal, shippingConfig)

  return {
    source: 'CART',
    paymentMethod: 'E_WALLET',
    currencyCode: 'VND',
    shippingFee,
    discountAmount: 0,
    subtotal,
    totalAmount: subtotal + shippingFee,
    itemCount: 1,
    totalQuantity: qty,
    hasUnavailableItems: draft.stock <= 0,
    items: [
      {
        cartItemId: `buy-now-${draft.variantId}`,
        productId: draft.productId,
        productName: draft.productName,
        productCategory: draft.category,
        productBrand: draft.brand,
        productImage: draft.productImage,
        unitPrice: draft.unitPrice,
        variantId: draft.variantId,
        size: draft.size,
        color: draft.color,
        sku: draft.sku,
        stock: draft.stock,
        quantity: qty,
        selected: true,
        addedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  }
}
