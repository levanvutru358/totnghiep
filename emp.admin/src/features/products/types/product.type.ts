export interface ProductColorImages {
  color: string
  colorId?: number
  imageUrls: string[]
}

export interface Product {
  id: string
  name: string
  description?: string
  /** Giá bán hiện tại (ưu tiên giá khuyến mãi nếu có). */
  price: number
  /** Giá gốc (base_price). */
  basePrice: number
  /** Giá khuyến mãi (sale_price), null nếu không giảm. */
  salePrice: number | null
  brand: string
  brandId?: string
  category: string
  categoryId?: string
  categorySlug?: string
  parentCategorySlug?: string
  stock: number
  /** Tổng số biến thể (API danh sách; chi tiết dùng `variants`). */
  variantCount?: number
  status: string
  image?: string
  images?: string[]
  colorImages?: ProductColorImages[]
  variants: ProductVariant[]
  createdAt: string
  updatedAt: string
}

export interface ProductVariant {
  id?: string
  size: string
  color: string
  sku: string
  stock: number
  /** Chỉ dùng trong form — phân biệt nhiều nhóm màu khi tên màu còn trống */
  groupClientId?: string
}

export interface ProductFilters {
  search?: string
  category?: string
  brand?: string
  status?: string
  minPrice?: number
  maxPrice?: number
}

export interface ProductsResponse {
  products: Product[]
  total: number
  page: number
  totalPages: number
}

export interface CreateProductRequest {
  name: string
  description?: string
  basePrice: number
  salePrice?: number | null
  brandId: string
  categoryId: string
  stock: number
  status: string
  imageUrls?: string[]
  imageFiles?: File[]
  colorImages?: ProductColorImages[]
  variants: ProductVariant[]
}

export type UpdateProductRequest = CreateProductRequest

export interface InventoryAdjustmentRequest {
  variantId: string
  type: 'import' | 'export' | 'adjust'
  quantity: number
  note?: string
}

export interface InventoryTransactionUpdateRequest {
  type?: 'import' | 'export' | 'adjust'
  quantity?: number
  note?: string
}

export interface InventoryLog {
  id: string
  variantId: string
  sku: string
  productName: string
  brand?: string
  type: 'import' | 'export' | 'adjust'
  quantity: number
  stockAfter: number
  createdAt: string
  note?: string
}

export interface InventoryLogFilters {
  variantId?: string
  type?: '' | 'import' | 'export' | 'adjust'
  brand?: string
  search?: string
  dateFrom?: string
  dateTo?: string
  page?: number
  limit?: number
}

export interface InventoryLogsResponse {
  items: InventoryLog[]
  total: number
  page: number
  totalPages: number
}