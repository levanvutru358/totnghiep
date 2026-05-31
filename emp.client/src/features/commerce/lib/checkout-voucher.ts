const STORAGE_KEY = 'emp.client.checkout_voucher'

export const persistCheckoutVoucher = (code: string | null) => {
  if (!code || code === 'none') {
    sessionStorage.removeItem(STORAGE_KEY)
    return
  }
  sessionStorage.setItem(STORAGE_KEY, code.trim().toUpperCase())
}

export const readCheckoutVoucher = (): string | null => {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  return raw?.trim() ? raw : null
}

export const clearCheckoutVoucher = () => {
  sessionStorage.removeItem(STORAGE_KEY)
}
