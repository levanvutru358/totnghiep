import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'

export interface CategoryItem {
  id: string
  name: string
  slug: string
  parentId: string | null
  parentSlug: string | null
}

interface ServerCategoryItem {
  id: number
  name: string
  slug: string
  parent_id: number | null
  parent_slug?: string | null
}

interface ServerCategoriesList {
  items: ServerCategoryItem[]
}

const toClientCategory = (item: ServerCategoryItem): CategoryItem => ({
  id: String(item.id),
  name: item.name,
  slug: item.slug,
  parentId: item.parent_id != null ? String(item.parent_id) : null,
  parentSlug: item.parent_slug ?? null,
})

export const clientCategoriesApi = {
  list: async (): Promise<CategoryItem[]> => {
    const response = await http.get<ApiResponse<ServerCategoriesList>>('/categories', {
      params: { page: 1, limit: 200 },
    })
    return (response.data.data.items ?? []).map(toClientCategory)
  },
}
