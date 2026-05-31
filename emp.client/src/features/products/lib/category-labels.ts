/** Nhãn danh mục cửa hàng giày (slug hoặc tên DB → hiển thị). */
const categoryLabelsBySlug: Record<string, string> = {
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

const categoryLabelsByName: Record<string, string> = {
  Shoes: 'Giày dép',
  'Giày chạy bộ': 'Giày chạy bộ',
  'Sneaker & lifestyle': 'Sneaker & lifestyle',
  'Giày bóng rổ': 'Giày bóng rổ',
  'Giày training – gym': 'Giày training – gym',
  'Sandal & dép': 'Sandal & dép',
  'Boots – cổ cao': 'Boots – cổ cao',
  'Giày leo núi – outdoor': 'Giày leo núi – outdoor',
  'Phụ kiện giày dép': 'Phụ kiện giày dép',
}

export const formatCategoryLabel = (name: string, slug?: string): string => {
  if (slug && categoryLabelsBySlug[slug]) return categoryLabelsBySlug[slug]
  if (categoryLabelsByName[name]) return categoryLabelsByName[name]
  return name
}

export const formatProductCategoryLine = (product: {
  category: string
  subcategoryName?: string
}): string => (product.subcategoryName ? `${product.category} · ${product.subcategoryName}` : product.category)
