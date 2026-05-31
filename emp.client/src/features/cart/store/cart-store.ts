import { useEffect, useMemo, useState } from 'react'

export interface CartItem {
  id: string
  productId: string
  name: string
  image: string
  price: number
  sku: string
  size: string
  color: string
  stock: number
  quantity: number
}

const CART_STORAGE_KEY = 'client_cart'
const CART_UPDATED_EVENT = 'client-cart-updated'

const readCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as CartItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const writeCart = (items: CartItem[]) => {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items))
  window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
}

export const cartStore = {
  getItems: (): CartItem[] => readCart(),

  addItem: (item: Omit<CartItem, 'id'>) => {
    const current = readCart()
    const id = `${item.productId}-${item.sku}`
    const existing = current.find((x) => x.id === id)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + item.quantity, existing.stock)
      writeCart([...current])
      return
    }
    writeCart([...current, { ...item, id }])
  },

  updateQuantity: (id: string, qty: number) => {
    const current = readCart()
    const next = current.map((item) =>
      item.id === id ? { ...item, quantity: Math.max(1, Math.min(qty, item.stock)) } : item,
    )
    writeCart(next)
  },

  removeItem: (id: string) => {
    const current = readCart()
    writeCart(current.filter((item) => item.id !== id))
  },

  removeBySku: (sku: string) => {
    const current = readCart()
    writeCart(current.filter((item) => item.sku !== sku))
  },

  clear: () => writeCart([]),
}

export const useCart = () => {
  const [items, setItems] = useState<CartItem[]>(() => cartStore.getItems())

  useEffect(() => {
    const onUpdate = () => setItems(cartStore.getItems())
    window.addEventListener(CART_UPDATED_EVENT, onUpdate)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onUpdate)
  }, [])

  const summary = useMemo(() => {
    const totalQty = items.reduce((sum, item) => sum + item.quantity, 0)
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return { totalQty, subtotal }
  }, [items])

  return {
    items,
    ...summary,
    addItem: cartStore.addItem,
    updateQuantity: cartStore.updateQuantity,
    removeItem: cartStore.removeItem,
    clear: cartStore.clear,
  }
}
