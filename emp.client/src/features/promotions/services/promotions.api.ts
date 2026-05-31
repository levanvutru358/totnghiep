import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

export type ShopPromotion = {
  id: number
  code: string
  name: string
  description: string | null
  discountType: 'FIXED' | 'PERCENT' | 'FREE_SHIPPING'
  discountValue: number
  minOrderAmount: number
  chipLabel: string
  summaryTitle: string
  shortDesc: string
  alreadyUsed?: boolean
}

type ApiRecord = Record<string, unknown>

const mapPromotion = (row: ApiRecord): ShopPromotion => ({
  id: Number(row.id ?? 0),
  code: String(row.code ?? ''),
  name: String(row.name ?? ''),
  description: row.description == null ? null : String(row.description),
  discountType: String(row.discountType ?? row.discount_type ?? 'FIXED') as ShopPromotion['discountType'],
  discountValue: Number(row.discountValue ?? row.discount_value ?? 0),
  minOrderAmount: Number(row.minOrderAmount ?? row.min_order_amount ?? 0),
  chipLabel: String(row.chipLabel ?? ''),
  summaryTitle: String(row.summaryTitle ?? row.name ?? ''),
  shortDesc: String(row.shortDesc ?? row.description ?? ''),
  alreadyUsed: Boolean(row.alreadyUsed ?? row.already_used ?? false),
})

export const promotionsApi = {
  listAvailable: async (): Promise<ShopPromotion[]> => {
    const response = await http.get<ApiResponse<{ items: ApiRecord[] }>>('/promotions/available')
    const items = response.data.data?.items ?? []
    return Array.isArray(items) ? items.map(mapPromotion) : []
  },

  listAvailableForMe: async (): Promise<ShopPromotion[]> => {
    const response = await http.get<ApiResponse<{ items: ApiRecord[] }>>('/promotions/available/me')
    const items = response.data.data?.items ?? []
    return Array.isArray(items) ? items.map(mapPromotion) : []
  },

  /** Public list for guests; authenticated list includes `alreadyUsed` per user. */
  listForShop: async (authenticated: boolean): Promise<ShopPromotion[]> => {
    if (!authenticated) return promotionsApi.listAvailable()
    try {
      return await promotionsApi.listAvailableForMe()
    } catch {
      return promotionsApi.listAvailable()
    }
  },
}
