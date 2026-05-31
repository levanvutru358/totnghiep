export type ProductMarketingOffer = {
  discountPercent: number
  badgeLabel: string | null
  catalogPrice: number
  displayPrice: number
}

export interface ProductVariant {
  id: string
  size: string
  color: string
  sku: string
  stock: number
}

export interface ProductItem {
  id: string
  /** Mã shop (kiểu Shopee), ví dụ 88201679 */
  shopId: string
  /** Mã listing hiển thị trên URL, ví dụ 18093055535 */
  listingId: string
  name: string
  category: string
  /** Slug danh mục con (leaf) */
  categorySlug?: string
  /** Slug nhóm cha (running, lifestyle, …) */
  parentCategorySlug?: string | null
  /** Tên loại con khi có danh mục 2 cấp */
  subcategoryName?: string
  brand: string
  price: number
  /** Giá gốc để hiển thị gạch ngang / % giảm (UI kiểu Shopee) */
  originalPrice?: number
  image: string
  images?: string[]
  colorImages?: Array<{ color: string; images: string[] }>
  description: string
  variants: ProductVariant[]
  /** Giảm % từ Tiếp thị admin (nếu sản phẩm nằm trong khối marketing) */
  marketingOffer?: ProductMarketingOffer | null
}

