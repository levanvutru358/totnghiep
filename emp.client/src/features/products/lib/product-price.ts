/** Giá catalog: số nhỏ (< 100_000) coi là đơn vị nghìn đồng (129 → 129.000đ). */
export const toDisplayVnd = (amount: number): number => {
  if (!Number.isFinite(amount)) return 0
  if (amount >= 100_000) return Math.round(amount)
  return Math.round(amount * 1000)
}

export const formatProductPrice = (amount: number): string =>
  `${toDisplayVnd(amount).toLocaleString('vi-VN')}đ`
