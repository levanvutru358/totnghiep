import axios from 'axios'
import { http } from '../../../lib/axios'
import { multipartConfig } from '../../../lib/multipart'
import { toSlug } from '../../../lib/utils'
import type { ApiResponse } from '../../../types/api.type'
import type {
  CreateProductRequest,
  InventoryAdjustmentRequest,
  InventoryLogFilters,
  InventoryLogsResponse,
  Product,
  ProductsResponse,
  UpdateProductRequest,
  InventoryTransactionUpdateRequest,
} from '../types/product.type'
import { formatProductCategoryLabel } from '../../categories/utils/category-brand.util'
import {
  resolveOrCreateReferenceId,
  toClientInventoryType,
  toServerInventoryTransactionType,
} from '../utils/products.util'

interface ServerProductListItem {
  id: number
  name: string
  slug: string
  short_description: string | null
  base_price: number
  sale_price: number | null
  thumbnail_url: string | null
  is_featured: number
  is_active?: number
  created_at: string
  category_id?: number
  brand_id?: number
  category_name: string
  category_slug?: string
  parent_category_name?: string | null
  parent_category_slug?: string | null
  brand_name: string
  variant_count?: number
  total_stock?: number
}

interface ServerProductsListData {
  items: ServerProductListItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ServerProductDetail extends Omit<ServerProductListItem, 'short_description'> {
  short_description: string | null
  description?: string | null
  updated_at?: string
  is_active?: number
  images?: string[]
  colorImages?: Array<{
    colorId?: number
    colorName?: string
    images?: string[]
  }>
  variants?: Array<{
    id: number
    sku: string
    stock_quantity: number
    size_label?: string
    color_name?: string
  }>
}

interface ServerInventoryItem {
  id: number
  variant_id: number
  sku: string
  product_name?: string
  brand_name?: string
  transaction_type: 'IN' | 'OUT' | 'ADJUSTMENT'
  quantity: number
  stock_after?: number | null
  note?: string | null
  created_at: string
}

interface ServerInventoryList {
  items: ServerInventoryItem[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface ServerRelatedProductItem {
  id: number
  name: string
  slug: string
  thumbnail_url: string | null
  base_price: number
  sale_price: number | null
}

interface ServerVariantListItem {
  id: number
  sku: string
  stock_quantity: number
  size_label: string
  color_name: string
  product_id: number
  product_name?: string
  brand_name?: string
  category_name?: string
}

interface ServerVariantList {
  items: ServerVariantListItem[]
}

export interface InventoryVariantOption {
  id: string
  sku: string
  stock: number
  size: string
  color: string
  productId: string
  productName: string
  brand: string
  category: string
}

const toNumberSafe = (value: unknown, fallback = 0): number => {
  const num = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(num) ? num : fallback
}

const mapProductPrices = (item: { base_price: number; sale_price: number | null }) => {
  const basePrice = toNumberSafe(item.base_price, 0)
  const saleRaw = item.sale_price
  const salePrice =
    saleRaw !== null && saleRaw !== undefined && saleRaw !== '' ? toNumberSafe(saleRaw, 0) : null
  const price =
    salePrice !== null && salePrice < basePrice ? salePrice : basePrice

  return { basePrice, salePrice, price }
}

const mapCategoryFields = (item: ServerProductListItem) => ({
  category: formatProductCategoryLabel(
    item.category_name,
    item.parent_category_name,
    item.parent_category_slug,
  ),
  categoryId: item.category_id ? String(item.category_id) : undefined,
  categorySlug: item.category_slug,
  parentCategorySlug: item.parent_category_slug ?? undefined,
})

const toClientProduct = (item: ServerProductListItem): Product => {
  const variantCount = toNumberSafe(item.variant_count, 0)
  const totalStock = toNumberSafe(item.total_stock, 0)

  const prices = mapProductPrices(item)

  return {
    id: String(item.id),
    name: item.name,
    description: item.short_description ?? '',
    ...prices,
    brand: item.brand_name,
    brandId: item.brand_id ? String(item.brand_id) : undefined,
    ...mapCategoryFields(item),
    stock: totalStock,
    variantCount,
    status: Number(item.is_active ?? 1) === 1 ? 'active' : 'inactive',
    image: item.thumbnail_url ?? '',
    variants: [],
    createdAt: item.created_at,
    updatedAt: item.created_at,
  }
}

const toClientRelatedProduct = (item: ServerRelatedProductItem): Product => {
  const prices = mapProductPrices(item)
  return {
  id: String(item.id),
  name: item.name,
  description: '',
  ...prices,
  brand: '',
  category: '',
  stock: 0,
  status: 'active',
  image: item.thumbnail_url ?? '',
  variants: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  }
}

const mapServerColorImages = (item: ServerProductDetail): Product['colorImages'] => {
  const fromColorTable = (item.colorImages ?? []).map((entry) => ({
    color: entry.colorName ?? '',
    colorId: entry.colorId,
    imageUrls: entry.images ?? [],
  }))
  if (fromColorTable.some((entry) => entry.imageUrls.length > 0)) {
    return fromColorTable
  }

  const flatImages =
    Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.thumbnail_url
        ? [item.thumbnail_url]
        : []
  if (flatImages.length === 0) return fromColorTable

  const colors = [
    ...new Set(
      (item.variants ?? [])
        .map((variant) => (variant.color_name ?? '').trim())
        .filter(Boolean),
    ),
  ]
  if (colors.length === 0) return fromColorTable

  return colors.map((color, index) => ({
    color,
    imageUrls: index === 0 ? flatImages : [],
  }))
}

const toClientProductDetail = (item: ServerProductDetail): Product => {
  const prices = mapProductPrices(item)
  return {
  id: String(item.id),
  name: item.name,
  description: item.description ?? item.short_description ?? '',
  ...prices,
  brand: item.brand_name,
  brandId: item.brand_id ? String(item.brand_id) : undefined,
  ...mapCategoryFields(item),
  stock: (item.variants ?? []).reduce((sum, variant) => sum + Number(variant.stock_quantity || 0), 0),
  status: Number(item.is_active ?? 1) === 1 ? 'active' : 'inactive',
  image: item.thumbnail_url ?? '',
  images:
    Array.isArray(item.images) && item.images.length > 0
      ? item.images
      : item.thumbnail_url
        ? [item.thumbnail_url]
        : [],
  colorImages: mapServerColorImages(item),
  variants: (item.variants ?? []).map((variant) => ({
    id: String(variant.id),
    size: variant.size_label ?? '',
    color: variant.color_name ?? '',
    sku: variant.sku,
    stock: Number(variant.stock_quantity || 0),
  })),
  createdAt: item.created_at,
  updatedAt: item.updated_at ?? item.created_at,
  }
}

const toProductPayload = (data: CreateProductRequest | UpdateProductRequest) => {
  const basePrice = Number(data.basePrice)
  const saleRaw = data.salePrice
  const salePrice =
    saleRaw !== null && saleRaw !== undefined && saleRaw !== '' && Number(saleRaw) < basePrice
      ? Number(saleRaw)
      : null

  const basePayload = {
    name: data.name,
    slug: toSlug(data.name),
    categoryId: 0,
    brandId: 0,
    shortDescription: data.description ?? null,
    description: data.description ?? null,
    basePrice,
    salePrice,
    thumbnailUrl: data.imageUrls?.[0] ?? null,
    isFeatured: false,
  }

  return basePayload
}

type ProductFormBody = Record<string, string | number | boolean | null | undefined>

const appendProductFormData = (
  formData: FormData,
  body: ProductFormBody,
  imageUrls?: string[],
  imageFiles?: File[],
) => {
  Object.entries(body).forEach(([key, value]) => {
    if (value !== null && typeof value !== 'undefined') {
      formData.append(key, String(value))
    }
  })
  if (imageUrls?.length) {
    formData.append('imageUrls', JSON.stringify(imageUrls))
  }
  imageFiles?.forEach((file) => formData.append('images', file))
}

export const productsApi = {
  getProducts: async (params?: {
    page?: number
    limit?: number
    search?: string
    category?: string
    brand?: string
    status?: string
  }): Promise<ProductsResponse> => {
    const queryParams: Record<string, string | number> = {
      page: params?.page ?? 1,
      limit: params?.limit ?? 50,
    }
    if (params?.search) queryParams.search = params.search
    if (params?.status === 'active' || params?.status === 'inactive') {
      queryParams.status = params.status
    }
    if (params?.category) {
      if (params.category.startsWith('parent:')) {
        queryParams.categorySlug = params.category.slice('parent:'.length)
      } else if (/^\d+$/.test(params.category)) {
        queryParams.categoryId = params.category
      } else {
        queryParams.categorySlug = params.category
      }
    }

    const response = await http.get<ApiResponse<ServerProductsListData>>('/products', {
      params: queryParams,
    })

    let mapped = response.data.data.items.map(toClientProduct)
    if (params?.brand) mapped = mapped.filter((product) => product.brand === params.brand)

    return {
      products: mapped,
      total: response.data.data.total ?? mapped.length,
      page: response.data.data.page,
      totalPages: response.data.data.totalPages,
    }
  },

  getProduct: async (id: string): Promise<Product> => {
    const response = await http.get<ApiResponse<ServerProductDetail>>(`/products/${id}`)
    return toClientProductDetail(response.data.data)
  },

  getRelatedProducts: async (id: string): Promise<Product[]> => {
    const response = await http.get<ApiResponse<ServerRelatedProductItem[]>>(`/products/${id}/related`)
    return response.data.data.map(toClientRelatedProduct)
  },

  createProduct: async (data: CreateProductRequest): Promise<Product> => {
    const payload = toProductPayload(data)
    payload.categoryId = Number(data.categoryId)
    payload.brandId = Number(data.brandId)

    const createBody = {
      ...payload,
      isActive: data.status === 'active',
    }

    const hasFiles = (data.imageFiles?.length ?? 0) > 0
    const imageUrls = data.imageUrls?.filter(Boolean)

    let response
    if (hasFiles) {
      const formData = new FormData()
      appendProductFormData(formData, createBody as ProductFormBody, imageUrls, data.imageFiles)
      response = await http.post<ApiResponse<ServerProductDetail>>('/products', formData, multipartConfig())
    } else {
      response = await http.post<ApiResponse<ServerProductDetail>>('/products', {
        ...createBody,
        ...(imageUrls?.length ? { imageUrls } : {}),
        ...(data.colorImages?.length
          ? {
              colorImages: data.colorImages.map((entry) => ({
                color: entry.color,
                imageUrls: entry.imageUrls,
              })),
            }
          : {}),
      })
    }

    const productId = response.data.data.id

    for (const variant of data.variants) {
      const sizeId = await resolveOrCreateReferenceId('/sizes', variant.size)
      const colorId = await resolveOrCreateReferenceId('/colors', variant.color)
      const payload = {
        productId,
        sizeId,
        colorId,
        sku: variant.sku.trim(),
        stockQuantity: variant.stock,
      }
      try {
        await http.post('/variants', payload)
      } catch (error) {
        if (!axios.isAxiosError(error) || error.response?.status !== 409) {
          throw error
        }
        const refreshed = await productsApi.getProduct(String(productId))
        const existing = refreshed.variants.find(
          (item) => item.sku.trim().toLowerCase() === variant.sku.trim().toLowerCase(),
        )
        if (!existing?.id) throw error
        await http.put(`/variants/${existing.id}`, {
          sizeId,
          colorId,
          sku: variant.sku.trim(),
          stockQuantity: variant.stock,
          isActive: true,
        })
      }
    }

    return productsApi.getProduct(String(productId))
  },

  updateProduct: async (id: string, data: UpdateProductRequest): Promise<Product> => {
    const detail = await productsApi.getProduct(id)
    const payload = {
      ...toProductPayload(data),
      categoryId: Number(data.categoryId),
      brandId: Number(data.brandId),
      isActive: data.status === 'active',
    }

    const hasFiles = (data.imageFiles?.length ?? 0) > 0
    const imageUrls = data.imageUrls ?? []

    if (hasFiles) {
      const formData = new FormData()
      appendProductFormData(formData, payload as ProductFormBody, imageUrls, data.imageFiles)
      await http.put<ApiResponse<ServerProductDetail>>(`/products/${id}`, formData, multipartConfig())
    } else {
      await http.put<ApiResponse<ServerProductDetail>>(`/products/${id}`, {
        ...payload,
        imageUrls,
        ...(data.colorImages?.length
          ? {
              colorImages: data.colorImages.map((entry) => ({
                color: entry.color,
                imageUrls: entry.imageUrls,
              })),
            }
          : {}),
      })
    }

    const existingById = new Map(
      detail.variants.filter((item) => item.id).map((item) => [String(item.id), item]),
    )
    const existingBySku = new Map(
      detail.variants.map((item) => [item.sku.trim().toLowerCase(), item]),
    )
    const keptVariantIds = new Set<string>()

    for (const variant of data.variants) {
      const sizeId = await resolveOrCreateReferenceId('/sizes', variant.size)
      const colorId = await resolveOrCreateReferenceId('/colors', variant.color)
      const payload = {
        sizeId,
        colorId,
        sku: variant.sku.trim(),
        stockQuantity: variant.stock,
        isActive: true,
      }

      const variantId = variant.id?.trim()
      if (variantId && existingById.has(variantId)) {
        await http.put(`/variants/${variantId}`, payload)
        keptVariantIds.add(variantId)
        continue
      }

      const matchedBySku = existingBySku.get(variant.sku.trim().toLowerCase())
      if (matchedBySku?.id) {
        await http.put(`/variants/${matchedBySku.id}`, payload)
        keptVariantIds.add(String(matchedBySku.id))
        continue
      }

      try {
        await http.post('/variants', {
          productId: Number(detail.id),
          ...payload,
        })
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          const retryMatch = existingBySku.get(variant.sku.trim().toLowerCase())
          if (retryMatch?.id) {
            await http.put(`/variants/${retryMatch.id}`, payload)
            keptVariantIds.add(String(retryMatch.id))
            continue
          }
        }
        throw error
      }
    }

    for (const existing of detail.variants) {
      if (existing.id && !keptVariantIds.has(String(existing.id))) {
        await http.delete(`/variants/${existing.id}`)
      }
    }

    return productsApi.getProduct(id)
  },

  deleteProduct: async (id: string): Promise<void> => {
    await http.delete(`/products/${id}`)
  },

  getInventoryLogs: async (filters: InventoryLogFilters = {}): Promise<InventoryLogsResponse> => {
    const params: Record<string, string | number> = {
      page: filters.page ?? 1,
      limit: filters.limit ?? 20,
    }
    if (filters.variantId) params.variantId = Number(filters.variantId)
    if (filters.type) params.transactionType = toServerInventoryTransactionType(filters.type)
    if (filters.brand) params.brand = filters.brand
    if (filters.search?.trim()) params.search = filters.search.trim()
    if (filters.dateFrom) params.dateFrom = filters.dateFrom
    if (filters.dateTo) params.dateTo = filters.dateTo

    const response = await http.get<ApiResponse<ServerInventoryList>>('/inventory/transactions', { params })
    const data = response.data.data
    return {
      items: data.items.map((item) => ({
        id: String(item.id),
        variantId: String(item.variant_id),
        sku: item.sku,
        productName: item.product_name ?? `Biến thể #${item.variant_id}`,
        brand: item.brand_name ?? '',
        type: toClientInventoryType(item.transaction_type),
        quantity: item.quantity,
        stockAfter: Number(item.stock_after ?? 0),
        createdAt: item.created_at,
        note: item.note ?? '',
      })),
      total: data.total ?? data.items.length,
      page: data.page ?? 1,
      totalPages: data.totalPages ?? 1,
    }
  },

  adjustInventory: async (payload: InventoryAdjustmentRequest): Promise<void> => {
    await http.post('/inventory/transactions', {
      variantId: Number(payload.variantId),
      transactionType: toServerInventoryTransactionType(payload.type),
      quantity: payload.quantity,
      note: payload.note ?? null,
    })
  },

  updateInventoryTransaction: async (id: string, payload: InventoryTransactionUpdateRequest): Promise<void> => {
    const body: Record<string, unknown> = {}
    if (payload.type) body.transactionType = toServerInventoryTransactionType(payload.type)
    if (typeof payload.quantity !== 'undefined') body.quantity = payload.quantity
    if (typeof payload.note !== 'undefined') body.note = payload.note
    await http.put(`/inventory/transactions/${id}`, body)
  },

  deleteInventoryTransaction: async (id: string): Promise<void> => {
    await http.delete(`/inventory/transactions/${id}`)
  },

  getVariants: async (): Promise<InventoryVariantOption[]> => {
    const response = await http.get<ApiResponse<ServerVariantList>>('/variants', { params: { page: 1, limit: 300 } })
    return response.data.data.items.map((item) => ({
      id: String(item.id),
      sku: item.sku,
      stock: Number(item.stock_quantity || 0),
      size: item.size_label,
      color: item.color_name,
      productId: String(item.product_id),
      productName: item.product_name ?? `Sản phẩm #${item.product_id}`,
      brand: item.brand_name ?? 'Khác',
      category: item.category_name ?? '',
    }))
  },
}