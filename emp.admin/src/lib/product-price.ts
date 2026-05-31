/** Đồng bộ với emp.client — giá DB nhỏ (< 100_000) là đơn vị nghìn đồng. */
export const toDisplayVnd = (amount: number): number => {
  if (!Number.isFinite(amount)) return 0
  if (amount >= 100_000) return Math.round(amount)
  return Math.round(amount * 1000)
}

export const formatProductPrice = (amount: number): string =>
  `${toDisplayVnd(amount).toLocaleString('vi-VN')}đ`
