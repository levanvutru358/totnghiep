import type { ProductItem } from '../types/product.type'

/** Slug Latin cho URL thân thiện SEO (giống Shopee). */
export function slugify(text: string): string {
  const s = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'san-pham'
}

/**
 * Đường dẫn kiểu Shopee: /product/{slug}-i.{shopId}.{listingId}
 * Ví dụ: /product/dien-thoai-apple-iphone-15-128gb-i.88201679.18093055535
 */
export function buildProductPath(p: ProductItem): string {
  const slug = slugify(p.name)
  return `/product/${slug}-i.${p.shopId}.${p.listingId}`
}

/** Lấy khóa tra cứu sản phẩm từ segment URL (listingId hoặc id cũ). */
export function parseProductPathKey(pathKey: string): string {
  const decoded = decodeURIComponent(pathKey)
  const m = decoded.match(/^(.+)-i\.(\d+)\.(\d+)$/)
  if (m) return m[3]
  return decoded
}

export function findProductByPathKey(pathKey: string | undefined, list: ProductItem[]): ProductItem | undefined {
  if (!pathKey) return undefined
  const key = parseProductPathKey(pathKey)
  return list.find((p) => p.listingId === key || p.id === key)
}

/** URL chi tiết sản phẩm từ giỏ hàng / đơn hàng (chỉ cần id + tên hoặc slug). */
export function buildProductDetailHref(
  productId: string,
  productName: string,
  productSlug?: string,
): string {
  const id = productId.trim()
  if (!id) return '/'
  const slug = productSlug?.trim() || slugify(productName)
  return `/product/${slug}-i.${id}.${id}`
}
