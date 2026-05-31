import type { ProductVariant } from '../types/product.type'

export type VariantSizeRow = {
  id?: string
  size: string
  sku: string
  stock: number
}

export type VariantColorGroup = {
  /** Khóa React ổn định — không đổi khi gõ tên màu */
  clientId: string
  color: string
  sizes: VariantSizeRow[]
  imageUrls: string[]
}

export type ProductColorImagePayload = {
  color: string
  imageUrls: string[]
}

let colorGroupIdCounter = 0
const nextColorGroupId = () => `color-${++colorGroupIdCounter}-${Date.now()}`

const normalizeColor = (color: string) => color.trim().toLowerCase()

export const slugToken = (value: string, maxLen = 8) =>
  value
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '')
    .toUpperCase()
    .slice(0, maxLen)

export const buildVariantSku = (color: string, size: string, prefix?: string) => {
  const colorPart = slugToken(color, 6) || 'CLR'
  const sizePart = slugToken(size, 4) || 'SZ'
  const prefixPart = prefix ? `${slugToken(prefix, 10)}-` : ''
  return `${prefixPart}${colorPart}-${sizePart}`
}

export const parseSizeList = (raw: string): string[] => {
  const seen = new Set<string>()
  const result: string[] = []
  for (const part of raw.split(/[,;|\s]+/)) {
    const size = part.trim()
    if (!size) continue
    const key = size.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    result.push(size)
  }
  return result
}

export const variantsToColorGroups = (variants: ProductVariant[]): VariantColorGroup[] => {
  const groups: VariantColorGroup[] = []
  const indexByKey = new Map<string, number>()

  for (const variant of variants) {
    const color = variant.color ?? ''
    const key =
      variant.groupClientId?.trim() ||
      (color.trim() ? normalizeColor(color) : '__empty__')
    let groupIndex = indexByKey.get(key)

    if (groupIndex === undefined) {
      groupIndex = groups.length
      indexByKey.set(key, groupIndex)
      groups.push({
        clientId: variant.groupClientId?.trim() || nextColorGroupId(),
        color,
        sizes: [],
        imageUrls: [],
      })
    }

    groups[groupIndex].sizes.push({
      id: variant.id,
      size: variant.size ?? '',
      sku: variant.sku ?? '',
      stock: Number(variant.stock ?? 0),
    })
  }

  if (groups.length === 0) {
    return [createEmptyColorGroup()]
  }

  return groups
}

/** Đồng bộ form (giữ cả ô đang nhập dở). */
export const colorGroupsToVariants = (groups: VariantColorGroup[]): ProductVariant[] => {
  const variants: ProductVariant[] = []

  for (const group of groups) {
    for (const row of group.sizes) {
      variants.push({
        id: row.id,
        color: group.color,
        size: row.size,
        sku: row.sku,
        stock: Number(row.stock) || 0,
        groupClientId: group.clientId,
      })
    }
  }

  return variants
}

/** Chỉ lấy biến thể hợp lệ khi lưu sản phẩm. */
export const colorGroupsToValidVariants = (groups: VariantColorGroup[]): ProductVariant[] =>
  colorGroupsToVariants(groups)
    .filter((variant) => variant.color.trim() && variant.size.trim() && variant.sku.trim())
    .map(({ groupClientId: _groupClientId, ...variant }) => variant)

export const colorGroupsToColorImages = (groups: VariantColorGroup[]): ProductColorImagePayload[] =>
  groups
    .filter((group) => group.color.trim() && group.imageUrls.some((url) => url.trim()))
    .map((group) => ({
      color: group.color.trim(),
      imageUrls: group.imageUrls.map((url) => url.trim()).filter(Boolean),
    }))

export const mergeColorImagesIntoGroups = (
  groups: VariantColorGroup[],
  colorImages: ProductColorImagePayload[],
): VariantColorGroup[] => {
  const byColor = new Map(
    colorImages.map((item) => [normalizeColor(item.color), item.imageUrls.filter(Boolean)]),
  )
  return groups.map((group) => ({
    ...group,
    imageUrls: byColor.get(normalizeColor(group.color)) ?? group.imageUrls ?? [],
  }))
}

export const createEmptyColorGroup = (): VariantColorGroup => ({
  clientId: nextColorGroupId(),
  color: '',
  sizes: [],
  imageUrls: [],
})
