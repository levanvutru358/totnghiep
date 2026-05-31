export type TaxonomyKind = 'category' | 'brand'

interface TaxonomyUiConfig {
  createPlaceholder?: string
  createParentPlaceholder?: string
  createSuccessMessage?: string
  updateSuccessMessage?: string
  deleteSuccessMessage?: string
  badgeLabel: string
  badgeColorScheme: string
}

export interface ServerTaxonomyItem {
  id: number
  name: string
  slug: string
  parent_id?: number | null
  parent_name?: string | null
  parent_slug?: string | null
}

export interface ServerTaxonomyList {
  items: ServerTaxonomyItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface TaxonomyItem {
  id: string
  name: string
  slug: string
  parentId?: string | null
  parentName?: string | null
  parentSlug?: string | null
}

export const taxonomyUi: Record<TaxonomyKind, TaxonomyUiConfig> = {
  category: {
    createPlaceholder: 'VD: Road running, Retro',
    createParentPlaceholder: 'VD: Giày chạy bộ',
    createSuccessMessage: 'Đã thêm danh mục',
    updateSuccessMessage: 'Đã cập nhật danh mục',
    deleteSuccessMessage: 'Đã xóa danh mục',
    badgeLabel: 'Danh mục',
    badgeColorScheme: 'blue',
  },
  brand: {
    createPlaceholder: 'Thương hiệu mới',
    createSuccessMessage: 'Đã thêm thương hiệu',
    badgeLabel: 'Thương hiệu',
    badgeColorScheme: 'purple',
  },
}

export const normalizeTaxonomyName = (value: string) => value.trim()

const normalizeParentId = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null
  return String(value)
}

export const toClientTaxonomyItem = (item: ServerTaxonomyItem): TaxonomyItem => {
  const raw = item as ServerTaxonomyItem & { parentId?: number | string | null }
  return {
    id: String(item.id),
    name: item.name,
    slug: item.slug,
    parentId: normalizeParentId(raw.parent_id ?? raw.parentId),
    parentName: item.parent_name ?? null,
    parentSlug: item.parent_slug ?? null,
  }
}

const belongsToParent = (child: TaxonomyItem, parent: TaxonomyItem): boolean =>
  child.parentId === parent.id ||
  child.parentSlug === parent.slug ||
  child.slug.startsWith(`${parent.slug}-`)

/** Nhãn hiển thị danh mục giày (slug → tên). */
const categoryLabelsVi: Record<string, string> = {
  running: 'Giày chạy bộ',
  lifestyle: 'Sneaker & lifestyle',
  basketball: 'Giày bóng rổ',
  training: 'Giày training – gym',
  sandals: 'Sandal & dép',
  boots: 'Boots – cổ cao',
  outdoor: 'Giày leo núi – outdoor',
  'shoe-accessories': 'Phụ kiện giày dép',
  shoes: 'Giày dép',
}

export const getCategoryDisplayLabel = (item: TaxonomyItem): string =>
  categoryLabelsVi[item.slug] ?? item.name

const shoeCategoryOrder = [
  'running',
  'lifestyle',
  'basketball',
  'training',
  'sandals',
  'boots',
  'outdoor',
  'shoe-accessories',
]

export const sortShoeCategories = (items: TaxonomyItem[]): TaxonomyItem[] =>
  [...items].sort((a, b) => {
    const aParentSlug = a.parentSlug ?? a.slug
    const bParentSlug = b.parentSlug ?? b.slug
    const ai = shoeCategoryOrder.indexOf(aParentSlug)
    const bi = shoeCategoryOrder.indexOf(bParentSlug)
    if (ai === -1 && bi === -1) return a.name.localeCompare(b.name, 'vi')
    if (ai === -1) return 1
    if (bi === -1) return -1
    if (ai !== bi) return ai - bi
    if (!a.parentId && b.parentId) return -1
    if (a.parentId && !b.parentId) return 1
    return a.name.localeCompare(b.name, 'vi')
  })

export interface CategorySelectGroup {
  parent: TaxonomyItem
  children: TaxonomyItem[]
}

/** Nhóm danh mục cha → con cho dropdown sản phẩm. */
export const groupCategoriesForSelect = (items: TaxonomyItem[]): CategorySelectGroup[] => {
  const parents = sortShoeCategories(items.filter((item) => !item.parentId))
  const children = items.filter((item) => item.parentId)

  const groups = parents.map((parent) => ({
    parent,
    children: children
      .filter((child) => belongsToParent(child, parent))
      .sort((a, b) => a.name.localeCompare(b.name, 'vi')),
  }))

  const matchedChildIds = new Set(groups.flatMap((group) => group.children.map((child) => child.id)))
  const orphans = children.filter((child) => !matchedChildIds.has(child.id))
  if (orphans.length > 0) {
    groups.push({
      parent: {
        id: '__unassigned__',
        name: 'Chưa phân nhóm',
        slug: 'unassigned',
        parentId: null,
      },
      children: orphans.sort((a, b) => a.name.localeCompare(b.name, 'vi')),
    })
  }

  return groups
}

export const getFirstLeafCategoryId = (items: TaxonomyItem[]): string => {
  const grouped = groupCategoriesForSelect(items)
  const firstChild = grouped[0]?.children[0]
  if (firstChild) return firstChild.id
  return grouped[0]?.parent.id ?? items[0]?.id ?? ''
}

/** Nhãn danh mục trên danh sách/chi tiết sản phẩm (cha · con). */
export const formatProductCategoryLabel = (
  childName: string,
  parentName?: string | null,
  parentSlug?: string | null,
): string => {
  if (!parentName && !parentSlug) return childName
  const parentLabel = parentSlug ? getCategoryDisplayLabel({ id: '', name: parentName ?? '', slug: parentSlug }) : (parentName ?? '')
  return parentLabel ? `${parentLabel} · ${childName}` : childName
}
