import { cartStore } from '../../cart/store/cart-store'
import { notifyServerCartUpdated } from './cart-events'
import {
  commerceApi,
  type CommerceCartResponse,
  type GuestCartMergeItem,
} from '../services/commerce.api'

export interface MergeLocalGuestCartResult {
  cart: CommerceCartResponse
  skipped: string[]
  hadLocalItems: boolean
}

let mergeInFlight: Promise<MergeLocalGuestCartResult> | null = null

const aggregateGuestItems = (items: GuestCartMergeItem[]): GuestCartMergeItem[] => {
  const map = new Map<number, GuestCartMergeItem>()

  items.forEach((item) => {
    const current = map.get(item.variantId)
    if (current) {
      current.quantity += item.quantity
      current.selected = current.selected || (item.selected ?? true)
      return
    }

    map.set(item.variantId, {
      variantId: item.variantId,
      quantity: item.quantity,
      selected: item.selected ?? true,
    })
  })

  return Array.from(map.values())
}

export const buildGuestItemsFromLocalCart = async (): Promise<{
  items: GuestCartMergeItem[]
  skipped: string[]
}> => {
  const localItems = cartStore.getItems()
  const items: GuestCartMergeItem[] = []
  const skipped: string[] = []

  for (const item of localItems) {
    const variant = await commerceApi.findVariantBySku(item.sku)
    if (!variant) {
      skipped.push(`${item.name} (SKU: ${item.sku})`)
      continue
    }

    if (variant.stockQuantity <= 0) {
      skipped.push(`${item.name}: het hang`)
      continue
    }

    items.push({
      variantId: Number(variant.id),
      quantity: Math.min(item.quantity, variant.stockQuantity),
      selected: true,
    })
  }

  return { items: aggregateGuestItems(items), skipped }
}

const mergeLocalGuestCartOnce = async (options?: {
  clearLocal?: boolean
}): Promise<MergeLocalGuestCartResult> => {
  const localItems = cartStore.getItems()
  const hadLocalItems = localItems.length > 0

  if (!hadLocalItems) {
    const cart = await commerceApi.getCart()
    notifyServerCartUpdated(cart)
    return {
      cart,
      skipped: [],
      hadLocalItems: false,
    }
  }

  const serverCart = await commerceApi.getCart()
  const serverQtyByVariant = new Map(
    serverCart.items.map((item) => [Number(item.variantId), item.quantity]),
  )

  const { items: rawGuestItems, skipped } = await buildGuestItemsFromLocalCart()

  const items = rawGuestItems
    .map((item) => {
      const serverQty = serverQtyByVariant.get(item.variantId) ?? 0
      if (serverQty >= item.quantity) {
        return null
      }

      return {
        ...item,
        quantity: item.quantity - serverQty,
      }
    })
    .filter((item): item is GuestCartMergeItem => item !== null)

  if (items.length === 0) {
    if (skipped.length > 0) {
      throw new Error(`Không gộp được một số sản phẩm: ${skipped.join('; ')}`)
    }

    if (options?.clearLocal !== false) {
      cartStore.clear()
    }

    notifyServerCartUpdated(serverCart)
    return {
      cart: serverCart,
      skipped,
      hadLocalItems: true,
    }
  }

  const cart = await commerceApi.mergeGuestCart(items)

  if (options?.clearLocal !== false) {
    cartStore.clear()
  }

  notifyServerCartUpdated(cart)

  return { cart, skipped, hadLocalItems: true }
}

export const mergeLocalGuestCart = async (options?: {
  clearLocal?: boolean
}): Promise<MergeLocalGuestCartResult> => {
  if (mergeInFlight) return mergeInFlight

  mergeInFlight = mergeLocalGuestCartOnce(options).finally(() => {
    mergeInFlight = null
  })

  return mergeInFlight
}
