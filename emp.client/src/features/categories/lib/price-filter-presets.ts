import { formatProductPrice } from '../../products/lib/product-price'

export type PriceFilterPreset = {
  id: string
  label: string
  min: number | null
  max: number | null
}

/** Giá catalog (5 → 5.000đ hiển thị). */
export const PRICE_FILTER_PRESETS: PriceFilterPreset[] = [
  { id: 'all', label: 'Tất cả mức giá', min: null, max: null },
  { id: 'under-200', label: 'Dưới 200.000đ', min: null, max: 200 },
  { id: '200-500', label: '200.000đ – 500.000đ', min: 200, max: 500 },
  { id: '500-1000', label: '500.000đ – 1 triệu', min: 500, max: 1000 },
  { id: 'over-1000', label: 'Trên 1 triệu', min: 1000, max: null },
]

export const parsePriceParam = (value: string | null): number | undefined => {
  if (!value?.trim()) return undefined
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 0) return undefined
  return parsed
}

export const findActivePricePreset = (
  min: number | undefined,
  max: number | undefined,
): string => {
  const match = PRICE_FILTER_PRESETS.find(
    (preset) => preset.min === (min ?? null) && preset.max === (max ?? null),
  )
  return match?.id ?? 'custom'
}

export const formatPriceFilterSummary = (
  min: number | undefined,
  max: number | undefined,
): string | null => {
  if (min == null && max == null) return null
  if (min != null && max != null) {
    return `${formatProductPrice(min)} – ${formatProductPrice(max)}`
  }
  if (min != null) return `Từ ${formatProductPrice(min)}`
  if (max != null) return `Đến ${formatProductPrice(max)}`
  return null
}
