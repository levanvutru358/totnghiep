import type { CategoryItem } from '../services/categories.api'

const parentLabelsVi: Record<string, string> = {
  running: 'Giày chạy bộ',
  lifestyle: 'Sneaker & lifestyle',
  basketball: 'Giày bóng rổ',
  training: 'Giày training – gym',
  sandals: 'Sandal & dép',
  boots: 'Boots – cổ cao',
  outdoor: 'Giày leo núi – outdoor',
  'shoe-accessories': 'Phụ kiện giày dép',
}

const parentOrder = [
  'running',
  'lifestyle',
  'basketball',
  'training',
  'sandals',
  'boots',
  'outdoor',
  'shoe-accessories',
]

export interface ShoeCategoryMenuGroup {
  label: string
  slug: string
  children: Array<{ label: string; slug: string }>
}

export const getParentCategoryLabel = (slug: string, fallbackName: string): string =>
  parentLabelsVi[slug] ?? fallbackName

const findChildrenForParent = (items: CategoryItem[], parentSlug: string, parentId: string): CategoryItem[] =>
  items.filter(
    (child) =>
      child.parentId === parentId ||
      child.parentSlug === parentSlug ||
      child.slug.startsWith(`${parentSlug}-`),
  )

const buildGroup = (slug: string, parentFromApi: CategoryItem | undefined, items: CategoryItem[]): ShoeCategoryMenuGroup => {
  const parentId = parentFromApi?.id ?? slug
  return {
    label: getParentCategoryLabel(slug, parentFromApi?.name ?? slug),
    slug,
    children: findChildrenForParent(items, slug, parentId)
      .sort((a, b) => a.name.localeCompare(b.name, 'vi'))
      .map((child) => ({ label: child.name, slug: child.slug })),
  }
}

/** Mega menu: 8 nhóm chuẩn + nhóm thêm từ admin (nếu có). */
export const buildShoeCategoryMenu = (items: CategoryItem[]): ShoeCategoryMenuGroup[] => {
  const core = parentOrder.map((slug) => {
    const parentFromApi = items.find((item) => !item.parentId && item.slug === slug)
    return buildGroup(slug, parentFromApi, items)
  })

  const knownSlugs = new Set(parentOrder)
  const extraParents = items.filter((item) => !item.parentId && !knownSlugs.has(item.slug))
  const extra = extraParents.map((parent) => buildGroup(parent.slug, parent, items))

  return [...core, ...extra]
}
