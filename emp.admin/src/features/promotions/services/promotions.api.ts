import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type {
  PromotionCode,
  PromotionFilters,
  PromotionFormInput,
  PromotionListResponse,
} from '../types/promotion.type'

type ApiRecord = Record<string, unknown>

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

const mapPromotion = (row: ApiRecord): PromotionCode => ({
  id: toNumber(row.id),
  code: String(row.code ?? ''),
  name: String(row.name ?? ''),
  description: row.description == null ? null : String(row.description),
  discountType: String(row.discountType ?? row.discount_type ?? 'FIXED') as PromotionCode['discountType'],
  discountValue: toNumber(row.discountValue ?? row.discount_value),
  maxDiscountAmount:
    row.maxDiscountAmount == null && row.max_discount_amount == null
      ? null
      : toNumber(row.maxDiscountAmount ?? row.max_discount_amount),
  minOrderAmount: toNumber(row.minOrderAmount ?? row.min_order_amount),
  usageLimit:
    row.usageLimit == null && row.usage_limit == null
      ? null
      : toNumber(row.usageLimit ?? row.usage_limit),
  usageLimitPerUser:
    row.usageLimitPerUser == null && row.usage_limit_per_user == null
      ? null
      : toNumber(row.usageLimitPerUser ?? row.usage_limit_per_user),
  usedCount: toNumber(row.usedCount ?? row.used_count),
  startsAt: row.startsAt ? String(row.startsAt) : row.starts_at ? String(row.starts_at) : null,
  endsAt: row.endsAt ? String(row.endsAt) : row.ends_at ? String(row.ends_at) : null,
  isActive: Boolean(row.isActive ?? row.is_active),
  createdAt: String(row.createdAt ?? row.created_at ?? ''),
  updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
})

const unwrap = async <T>(promise: Promise<{ data: ApiResponse<T> }>) => {
  const response = await promise
  return response.data.data
}

export const promotionsApi = {
  list: async (filters: PromotionFilters = {}): Promise<PromotionListResponse> => {
    const data = await unwrap(
      http.get<ApiResponse<ApiRecord>>('/admin/promotions', {
        params: {
          search: filters.search,
          isActive: filters.isActive,
          page: filters.page ?? 1,
          limit: filters.limit ?? 20,
        },
      }),
    )

    const items = Array.isArray(data.items) ? data.items.map((row) => mapPromotion(row as ApiRecord)) : []

    return {
      items,
      page: toNumber(data.page, 1),
      limit: toNumber(data.limit, 20),
      total: toNumber(data.total),
      totalPages: toNumber(data.totalPages, 1),
    }
  },

  create: (body: PromotionFormInput) =>
    unwrap(http.post<ApiResponse<ApiRecord>>('/admin/promotions', body)).then(mapPromotion),

  update: (id: number, body: Partial<PromotionFormInput>) =>
    unwrap(http.patch<ApiResponse<ApiRecord>>(`/admin/promotions/${id}`, body)).then(mapPromotion),

  remove: (id: number) => http.delete(`/admin/promotions/${id}`),
}
