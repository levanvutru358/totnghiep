import type { CommerceCartResponse } from '../services/commerce.api'

export const notifyServerCartUpdated = (cart: CommerceCartResponse) => {
  window.dispatchEvent(
    new CustomEvent('server-cart-updated', {
      detail: { totalQuantity: cart.summary.totalQuantity },
    }),
  )
}
