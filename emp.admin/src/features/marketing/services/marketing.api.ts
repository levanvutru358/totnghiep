import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type {
  MarketingBanner,
  MarketingBannerFormInput,
  MarketingHomeSection,
  MarketingHomeSectionCode,
  MarketingHomeSectionFormInput,
  MarketingSectionProduct,
  MarketingSectionProductFormInput,
} from '../types/marketing.type'

type ApiRecord = Record<string, unknown>

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise
  return response.data.data
}

const mapBanner = (row: ApiRecord): MarketingBanner => ({
  id: toNumber(row.id),
  placement: String(row.placement ?? 'HOME_HERO'),
  title: String(row.title ?? ''),
  description: row.description == null ? null : String(row.description),
  imageUrl: String(row.imageUrl ?? row.image_url ?? ''),
  linkUrl: String(row.linkUrl ?? row.link_url ?? '/categories'),
  ctaLabel: row.ctaLabel == null && row.cta_label == null ? null : String(row.ctaLabel ?? row.cta_label ?? ''),
  sortOrder: toNumber(row.sortOrder ?? row.sort_order),
  isActive: Boolean(row.isActive ?? row.is_active),
  startsAt: row.startsAt ? String(row.startsAt) : row.starts_at ? String(row.starts_at) : null,
  endsAt: row.endsAt ? String(row.endsAt) : row.ends_at ? String(row.ends_at) : null,
})

const mapHomeSection = (row: ApiRecord): MarketingHomeSection => ({
  code: String(row.code ?? '') as MarketingHomeSectionCode,
  title: String(row.title ?? ''),
  subtitle: row.subtitle == null ? null : String(row.subtitle),
  badgeLabel: row.badgeLabel == null && row.badge_label == null ? null : String(row.badgeLabel ?? row.badge_label ?? ''),
  linkUrl: String(row.linkUrl ?? row.link_url ?? '/categories'),
  isActive: Boolean(row.isActive ?? row.is_active),
  sortOrder: toNumber(row.sortOrder ?? row.sort_order),
})

const mapSectionProduct = (row: ApiRecord): MarketingSectionProduct => {
  const product = (row.product ?? null) as ApiRecord | null

  return {
    id: toNumber(row.id),
    section: String(row.section ?? 'FLASH_SALE') as MarketingHomeSectionCode,
    productId: toNumber(row.productId ?? row.product_id),
    badgeLabel: row.badgeLabel == null && row.badge_label == null ? null : String(row.badgeLabel ?? row.badge_label ?? ''),
    discountPercent: (() => {
      if (row.discountPercent == null && row.discount_percent == null) return null
      const n = Number(row.discountPercent ?? row.discount_percent)
      return Number.isFinite(n) && n > 0 ? n : null
    })(),
    sortOrder: toNumber(row.sortOrder ?? row.sort_order),
    isActive: Boolean(row.isActive ?? row.is_active),
    endsAt: row.endsAt ? String(row.endsAt) : row.ends_at ? String(row.ends_at) : null,
    product: product
      ? {
          id: toNumber(product.id),
          name: String(product.name ?? ''),
          slug: String(product.slug ?? ''),
          thumbnailUrl: product.thumbnailUrl ? String(product.thumbnailUrl) : product.thumbnail_url ? String(product.thumbnail_url) : null,
          basePrice: toNumber(product.basePrice ?? product.base_price),
          salePrice:
            product.salePrice == null && product.sale_price == null
              ? null
              : toNumber(product.salePrice ?? product.sale_price),
          brandName: String(product.brandName ?? product.brand_name ?? ''),
          categoryName: String(product.categoryName ?? product.category_name ?? ''),
        }
      : null,
  }
}

const toBannerBody = (form: MarketingBannerFormInput) => ({
  placement: 'HOME_HERO',
  title: form.title.trim(),
  description: form.description.trim() || null,
  imageUrl: form.imageUrl.trim(),
  linkUrl: form.linkUrl.trim() || '/categories',
  ctaLabel: form.ctaLabel.trim() || null,
  sortOrder: form.sortOrder,
  isActive: form.isActive,
  startsAt: form.startsAt.trim() || null,
  endsAt: form.endsAt.trim() || null,
})

const toSectionProductBody = (form: MarketingSectionProductFormInput) => ({
  productId: Number(form.productId),
  badgeLabel: form.badgeLabel.trim() || null,
  discountPercent: form.discountPercent === '' ? null : Number(form.discountPercent),
  sortOrder: form.sortOrder,
  isActive: form.isActive,
  endsAt: form.endsAt.trim() || null,
})

const toHomeSectionBody = (form: MarketingHomeSectionFormInput) => ({
  title: form.title.trim(),
  subtitle: form.subtitle.trim() || null,
  badgeLabel: form.badgeLabel.trim() || null,
  linkUrl: form.linkUrl.trim() || '/categories',
  isActive: form.isActive,
  sortOrder: form.sortOrder,
})

export const marketingApi = {
  listBanners: async () => {
    const data = await unwrap(http.get<ApiResponse<ApiRecord>>('/admin/marketing/banners'))
    return Array.isArray(data.items) ? data.items.map((row) => mapBanner(row as ApiRecord)) : []
  },

  createBanner: (form: MarketingBannerFormInput) =>
    unwrap(http.post<ApiResponse<ApiRecord>>('/admin/marketing/banners', toBannerBody(form))).then(mapBanner),

  updateBanner: (id: number, form: MarketingBannerFormInput) =>
    unwrap(http.patch<ApiResponse<ApiRecord>>(`/admin/marketing/banners/${id}`, toBannerBody(form))).then(mapBanner),

  removeBanner: (id: number) => http.delete(`/admin/marketing/banners/${id}`),

  listHomeSections: async () => {
    const data = await unwrap(http.get<ApiResponse<ApiRecord>>('/admin/marketing/home-sections'))
    return Array.isArray(data.items) ? data.items.map((row) => mapHomeSection(row as ApiRecord)) : []
  },

  updateHomeSection: (code: MarketingHomeSectionCode, form: MarketingHomeSectionFormInput) =>
    unwrap(
      http.patch<ApiResponse<ApiRecord>>(`/admin/marketing/home-sections/${code}`, toHomeSectionBody(form)),
    ).then(mapHomeSection),

  listSectionProducts: async (section: MarketingHomeSectionCode) => {
    const data = await unwrap(
      http.get<ApiResponse<ApiRecord>>(`/admin/marketing/sections/${section}/products`),
    )
    return Array.isArray(data.items) ? data.items.map((row) => mapSectionProduct(row as ApiRecord)) : []
  },

  createSectionProduct: (section: MarketingHomeSectionCode, form: MarketingSectionProductFormInput) =>
    unwrap(
      http.post<ApiResponse<ApiRecord>>(`/admin/marketing/sections/${section}/products`, toSectionProductBody(form)),
    ).then(mapSectionProduct),

  updateSectionProduct: (id: number, form: MarketingSectionProductFormInput) =>
    unwrap(
      http.patch<ApiResponse<ApiRecord>>(`/admin/marketing/section-products/${id}`, toSectionProductBody(form)),
    ).then(mapSectionProduct),

  removeSectionProduct: (id: number) => http.delete(`/admin/marketing/section-products/${id}`),
}
