import type { InventoryVariantOption } from '../../products/services/products.api'

export type ProductVariantGroup = {
  productId: string
  productName: string
  category: string
  variants: InventoryVariantOption[]
  totalStock: number
}

export type BrandVariantGroup = {
  brand: string
  products: ProductVariantGroup[]
  variantCount: number
  totalStock: number
  lowStockCount: number
}

const LOW_STOCK_THRESHOLD = 10

export const isLowStock = (stock: number) => stock < LOW_STOCK_THRESHOLD

export const groupVariantsByBrand = (variants: InventoryVariantOption[]): BrandVariantGroup[] => {
  const brandMap = new Map<string, Map<string, ProductVariantGroup>>()

  for (const variant of variants) {
    const brandKey = variant.brand.trim() || 'Khác'
    if (!brandMap.has(brandKey)) brandMap.set(brandKey, new Map())
    const productMap = brandMap.get(brandKey)!
    if (!productMap.has(variant.productId)) {
      productMap.set(variant.productId, {
        productId: variant.productId,
        productName: variant.productName,
        category: variant.category,
        variants: [],
        totalStock: 0,
      })
    }
    const product = productMap.get(variant.productId)!
    product.variants.push(variant)
    product.totalStock += variant.stock
  }

  const groups: BrandVariantGroup[] = []

  for (const [brand, productMap] of brandMap) {
    const products = [...productMap.values()]
      .map((p) => ({
        ...p,
        variants: [...p.variants].sort((a, b) => a.sku.localeCompare(b.sku, 'vi')),
      }))
      .sort((a, b) => a.productName.localeCompare(b.productName, 'vi'))

    const allVariants = products.flatMap((p) => p.variants)
    groups.push({
      brand,
      products,
      variantCount: allVariants.length,
      totalStock: allVariants.reduce((sum, v) => sum + v.stock, 0),
      lowStockCount: allVariants.filter((v) => isLowStock(v.stock)).length,
    })
  }

  return groups.sort((a, b) => a.brand.localeCompare(b.brand, 'vi'))
}

export const filterVariantGroups = (
  groups: BrandVariantGroup[],
  filters: { brand?: string; search?: string; lowStockOnly?: boolean },
): BrandVariantGroup[] => {
  const search = filters.search?.trim().toLowerCase()
  return groups
    .filter((g) => !filters.brand || g.brand === filters.brand)
    .map((g) => {
      const products = g.products
        .map((p) => {
          let variants = p.variants
          if (filters.lowStockOnly) variants = variants.filter((v) => isLowStock(v.stock))
          if (search) {
            variants = variants.filter(
              (v) =>
                v.sku.toLowerCase().includes(search) ||
                p.productName.toLowerCase().includes(search) ||
                v.size.toLowerCase().includes(search) ||
                v.color.toLowerCase().includes(search),
            )
          }
          return { ...p, variants, totalStock: variants.reduce((s, v) => s + v.stock, 0) }
        })
        .filter((p) => p.variants.length > 0)

      const allVariants = products.flatMap((p) => p.variants)
      return {
        ...g,
        products,
        variantCount: allVariants.length,
        totalStock: allVariants.reduce((sum, v) => sum + v.stock, 0),
        lowStockCount: allVariants.filter((v) => isLowStock(v.stock)).length,
      }
    })
    .filter((g) => g.products.length > 0)
}
