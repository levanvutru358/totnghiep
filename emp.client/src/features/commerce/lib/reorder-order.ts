import { commerceApi } from '../services/commerce.api'
import { notifyServerCartUpdated } from './cart-events'

export async function reorderOrderToCart(orderCode: string) {
  const cart = await commerceApi.reorderToCart(orderCode)
  notifyServerCartUpdated(cart)
  return cart
}

export function formatReorderError(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.'
  }

  const message = error.message
  if (message.includes('REORDER_ITEM_UNAVAILABLE')) {
    const label = message.split(':').slice(1).join(':').trim()
    return label
      ? `Không thể mua lại: ${label} (hết hàng hoặc ngừng bán).`
      : 'Một số sản phẩm không còn bán hoặc hết hàng.'
  }

  if (message === 'ORDER_NOT_FOUND') {
    return 'Không tìm thấy đơn hàng.'
  }

  return message || 'Không thể thêm sản phẩm vào giỏ. Vui lòng thử lại.'
}
