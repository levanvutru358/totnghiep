import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'
import type { ProductItem, ProductVariant } from '../types/product.type'
import { formatCategoryLabel } from '../lib/category-labels'
import { resolveProductImageUrl } from '../lib/product-image-url'
import { parseProductPathKey } from '../utils/product-url'

interface ServerMarketingOffer {
  discountPercent?: number
  discount_percent?: number
  badgeLabel?: string | null
  badge_label?: string | null
  catalogPrice?: number
  catalog_price?: number
  displayPrice?: number
  display_price?: number
  section?: string
}

interface ServerProductListItem {
  id: number
  name: string
  slug: string
  short_description: string | null
  base_price: number
  sale_price: number | null
  thumbnail_url: string | null
  category_name: string
  category_slug?: string
  parent_category_name?: string | null
  parent_category_slug?: string | null
  brand_name: string
  marketingOffer?: ServerMarketingOffer | null
}

interface ServerProductsListData {
  items: ServerProductListItem[]
}

interface ServerProductDetail extends ServerProductListItem {
  description?: string | null
  images?: string[]
  colorImages?: Array<{
    colorId?: number
    colorName?: string
    images?: string[]
  }>
  variants?: Array<{
    id: number
    sku: string
    stock_quantity: number
    size_label?: string
    color_name?: string
  }>
  marketingOffer?: ServerMarketingOffer | null
}

const resolvePrice = (salePrice: number | null, basePrice: number): number =>
  salePrice !== null && typeof salePrice !== 'undefined' ? Number(salePrice) : Number(basePrice)

const fallbackImage =
  'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800'

const toClientVariants = (variants: ServerProductDetail['variants'], productId: number): ProductVariant[] => {
  const mapped = (variants ?? []).map((variant) => ({
    id: String(variant.id),
    size: variant.size_label ?? 'Default',
    color: variant.color_name ?? 'Default',
    sku: variant.sku,
    stock: Number(variant.stock_quantity || 0),
  }))

  if (mapped.length > 0) return mapped

  return [
    {
      id: `v-${productId}`,
      size: 'Default',
      color: 'Default',
      sku: `PRD-${productId}`,
      stock: 0,
    },
  ]
}

const mapMarketingOffer = (
  offerRaw: ServerMarketingOffer | null | undefined,
  catalogSellingPrice: number,
) => {
  const offerPct = offerRaw
    ? Number(offerRaw.discountPercent ?? offerRaw.discount_percent ?? 0)
    : 0
  if (!offerRaw || !Number.isFinite(offerPct) || offerPct <= 0) return null

  return {
    discountPercent: offerPct,
    badgeLabel:
      offerRaw.badgeLabel == null && offerRaw.badge_label == null
        ? null
        : String(offerRaw.badgeLabel ?? offerRaw.badge_label ?? ''),
    catalogPrice: Number(offerRaw.catalogPrice ?? offerRaw.catalog_price ?? catalogSellingPrice),
    displayPrice: Number(offerRaw.displayPrice ?? offerRaw.display_price ?? catalogSellingPrice),
  }
}

const toClientProduct = (item: ServerProductListItem): ProductItem => {
  const parentSlug = item.parent_category_slug ?? null
  const parentName = item.parent_category_name ?? null
  const displayCategory = parentSlug
    ? formatCategoryLabel(parentName ?? '', parentSlug)
    : formatCategoryLabel(item.category_name, item.category_slug)

  const catalogSellingPrice = resolvePrice(item.sale_price, item.base_price)
  const marketingOffer = mapMarketingOffer(item.marketingOffer, catalogSellingPrice)

  return {
  id: String(item.id),
  shopId: String(item.id),
  listingId: String(item.id),
  name: item.name,
  category: displayCategory,
  categorySlug: item.category_slug,
  parentCategorySlug: parentSlug,
  subcategoryName: parentSlug ? item.category_name : undefined,
  brand: item.brand_name,
  price: catalogSellingPrice,
  originalPrice: Number(item.base_price),
  image: resolveProductImageUrl(item.thumbnail_url) || fallbackImage,
  images: item.thumbnail_url ? [resolveProductImageUrl(item.thumbnail_url) || fallbackImage] : [],
  description: item.short_description ?? '',
  variants: [],
  marketingOffer,
  }
}

const toClientProductDetail = (item: ServerProductDetail): ProductItem => {
  const base = toClientProduct(item)
  const gallery =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images.map((url) => resolveProductImageUrl(url)).filter(Boolean)
      : base.image
        ? [base.image]
        : []

  const colorImages = (item.colorImages ?? []).map((entry) => ({
    color: entry.colorName ?? '',
    images: (entry.images ?? []).map((url) => resolveProductImageUrl(url)).filter(Boolean) as string[],
  }))

  const marketingOffer = mapMarketingOffer(item.marketingOffer, base.price)

  return {
    ...base,
    images: gallery,
    image: gallery[0] ?? base.image,
    colorImages,
    description: item.description ?? item.short_description ?? '',
    variants: toClientVariants(item.variants, item.id),
    marketingOffer,
  }
}

export const clientProductsApi = {
  list: async (options?: {
    categorySlug?: string
    search?: string
    minPrice?: number
    maxPrice?: number
  }): Promise<ProductItem[]> => {
    const params: Record<string, string> = { page: '1', limit: '60' }
    if (options?.categorySlug) params.categorySlug = options.categorySlug
    const keyword = options?.search?.trim()
    if (keyword) params.search = keyword
    if (options?.minPrice != null && Number.isFinite(options.minPrice)) {
      params.minPrice = String(options.minPrice)
    }
    if (options?.maxPrice != null && Number.isFinite(options.maxPrice)) {
      params.maxPrice = String(options.maxPrice)
    }
    const response = await http.get<ApiResponse<ServerProductsListData>>('/products', { params })
    return (response.data.data.items ?? []).map(toClientProduct)
  },

  getByPathKey: async (pathKey: string | undefined): Promise<ProductItem | null> => {
    if (!pathKey) return null
    const key = parseProductPathKey(pathKey)
    const response = await http.get<ApiResponse<ServerProductDetail>>(`/products/${encodeURIComponent(key)}`)
    return toClientProductDetail(response.data.data)
  },
}

