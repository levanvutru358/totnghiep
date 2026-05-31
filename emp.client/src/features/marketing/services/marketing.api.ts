import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

type ApiRecord = Record<string, unknown>

export type MarketingHeroSlide = {
  id: number
  src: string
  alt: string
  title: string
  desc: string
  ctaLabel: string
  to: string
}

export type MarketingHomeProduct = {
  id: string
  name: string
  slug: string
  image: string
  price: number
  basePrice: number
  brand: string
  category: string
  badgeLabel: string | null
  discountPercent: number | null
}

export type MarketingHomeSectionBlock = {
  code: string
  title: string
  subtitle: string | null
  badgeLabel: string | null
  linkUrl: string
  endsAt: string | null
  products: MarketingHomeProduct[]
}

export type MarketingHomeContent = {
  heroSlides: MarketingHeroSlide[]
  sections: Record<string, MarketingHomeSectionBlock>
  flashSale: {
    endsAt: string | null
    products: MarketingHomeProduct[]
  }
}

const fallbackApiUrl = 'http://localhost:8000/api'

const resolvePublicUrl = (url: string): string => {
  if (!url?.trim()) return ''
  const trimmed = url.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  const origin = (import.meta.env.VITE_API_URL || fallbackApiUrl).replace(/\/api\/?$/i, '')
  if (trimmed.startsWith('/')) return `${origin}${trimmed}`
  return `${origin}/${trimmed}`
}

const mapProduct = (row: ApiRecord): MarketingHomeProduct => {
  const image = String(row.image ?? '')
  return {
    id: String(row.id ?? ''),
    name: String(row.name ?? ''),
    slug: String(row.slug ?? ''),
    image: resolvePublicUrl(image),
    price: Number(row.price ?? 0),
    basePrice: Number(row.basePrice ?? row.base_price ?? 0),
    brand: String(row.brand ?? ''),
    category: String(row.category ?? ''),
    badgeLabel:
      row.badgeLabel == null && row.badge_label == null ? null : String(row.badgeLabel ?? row.badge_label ?? ''),
    discountPercent:
      row.discountPercent == null && row.discount_percent == null
        ? null
        : Number(row.discountPercent ?? row.discount_percent) || null,
  }
}

const mapSectionBlock = (row: ApiRecord): MarketingHomeSectionBlock => ({
  code: String(row.code ?? ''),
  title: String(row.title ?? ''),
  subtitle: row.subtitle == null ? null : String(row.subtitle),
  badgeLabel: row.badgeLabel == null && row.badge_label == null ? null : String(row.badgeLabel ?? row.badge_label ?? ''),
  linkUrl: String(row.linkUrl ?? row.link_url ?? '/categories'),
  endsAt: row.endsAt ? String(row.endsAt) : null,
  products: Array.isArray(row.products) ? row.products.map((item) => mapProduct(item as ApiRecord)) : [],
})

export const marketingApi = {
  getHome: async (): Promise<MarketingHomeContent> => {
    const response = await http.get<ApiResponse<ApiRecord>>('/marketing/home')
    const data = (response.data.data ?? {}) as ApiRecord

    const heroSlides = Array.isArray(data.heroSlides)
      ? data.heroSlides.map((slide) => {
          const row = slide as ApiRecord
          return {
            id: Number(row.id ?? 0),
            src: resolvePublicUrl(String(row.src ?? '')),
            alt: String(row.alt ?? ''),
            title: String(row.title ?? ''),
            desc: String(row.desc ?? ''),
            ctaLabel: String(row.ctaLabel ?? 'Xem ngay'),
            to: String(row.to ?? '/categories'),
          }
        })
      : []

    const sectionsRaw = (data.sections ?? {}) as ApiRecord
    const sections: Record<string, MarketingHomeSectionBlock> = {}
    Object.entries(sectionsRaw).forEach(([key, value]) => {
      sections[key] = mapSectionBlock({ ...(value as ApiRecord), code: key })
    })

    const flashSaleRaw = (data.flashSale ?? sections.FLASH_SALE ?? {}) as ApiRecord
    const flashSaleProducts = Array.isArray(flashSaleRaw.products)
      ? flashSaleRaw.products.map((item) => mapProduct(item as ApiRecord))
      : sections.FLASH_SALE?.products ?? []

    return {
      heroSlides,
      sections,
      flashSale: {
        endsAt: flashSaleRaw.endsAt ? String(flashSaleRaw.endsAt) : sections.FLASH_SALE?.endsAt ?? null,
        products: flashSaleProducts,
      },
    }
  },
}
