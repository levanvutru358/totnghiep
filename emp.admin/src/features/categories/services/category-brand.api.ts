import { http } from '../../../lib/axios'
import { toSlug } from '../../../lib/utils'
import type { ApiResponse } from '../../../types/api.type'
import type { ServerTaxonomyItem, ServerTaxonomyList, TaxonomyItem } from '../utils/category-brand.util'
import { normalizeTaxonomyName, toClientTaxonomyItem } from '../utils/category-brand.util'

export const categoryBrandApi = {
  async getCategories(): Promise<TaxonomyItem[]> {
    const response = await http.get<ApiResponse<ServerTaxonomyList>>('/categories', { params: { page: 1, limit: 200 } })
    return response.data.data.items.map(toClientTaxonomyItem)
  },

  async createCategory(payload: { name: string; parentId?: string; parentSlug?: string }): Promise<TaxonomyItem> {
    const normalized = normalizeTaxonomyName(payload.name)
    const slug = payload.parentSlug
      ? `${payload.parentSlug}-${toSlug(normalized)}`
      : toSlug(normalized)
    const response = await http.post<ApiResponse<ServerTaxonomyItem>>('/categories', {
      name: normalized,
      slug,
      ...(payload.parentId ? { parentId: Number(payload.parentId) } : {}),
    })
    return toClientTaxonomyItem(response.data.data)
  },

  async updateCategory(id: string, name: string): Promise<TaxonomyItem> {
    const normalized = normalizeTaxonomyName(name)
    const response = await http.put<ApiResponse<ServerTaxonomyItem>>(`/categories/${id}`, {
      name: normalized,
    })
    return toClientTaxonomyItem(response.data.data)
  },

  async deleteCategory(id: string): Promise<void> {
    await http.delete(`/categories/${id}`)
  },

  async getBrands(): Promise<TaxonomyItem[]> {
    const response = await http.get<ApiResponse<ServerTaxonomyList>>('/brands', { params: { page: 1, limit: 200 } })
    return response.data.data.items.map(toClientTaxonomyItem)
  },

  async createBrand(name: string): Promise<TaxonomyItem> {
    const normalized = normalizeTaxonomyName(name)
    const response = await http.post<ApiResponse<ServerTaxonomyItem>>('/brands', {
      name: normalized,
      slug: toSlug(normalized),
    })
    return toClientTaxonomyItem(response.data.data)
  },

  async deleteBrand(id: string): Promise<void> {
    await http.delete(`/brands/${id}`)
  },
}
