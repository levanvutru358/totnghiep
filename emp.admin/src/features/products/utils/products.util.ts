import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type { InventoryAdjustmentRequest, InventoryLog } from '../types/product.type'

interface ServerReferenceItem {
  id: number
  name?: string
  label?: string
}

interface ServerTaxonomyList {
  items: ServerReferenceItem[]
}

type InventoryTxType = 'IN' | 'OUT' | 'ADJUSTMENT'

export type ReferenceEndpoint = '/categories' | '/brands' | '/sizes' | '/colors'

const normalizeLookupKey = (value: string) => value.trim().toLowerCase()

/** Chuẩn hóa size số: "010" → "10", giữ nguyên nếu không phải số. */
export const normalizeSizeLabel = (value: string): string => {
  const trimmed = value.trim()
  if (/^\d+$/.test(trimmed)) {
    return String(Number.parseInt(trimmed, 10))
  }
  return trimmed
}

const capitalizeWord = (value: string) =>
  value.trim().charAt(0).toUpperCase() + value.trim().slice(1).toLowerCase()

const findReference = (items: ServerReferenceItem[], lookup: string, endpoint: ReferenceEndpoint) => {
  const key = normalizeLookupKey(lookup)
  return items.find((item) => {
    const name = item.name ?? item.label ?? ''
    if (normalizeLookupKey(name) === key) return true
    if (endpoint === '/sizes') {
      const normalized = normalizeSizeLabel(lookup)
      return normalizeLookupKey(item.label ?? '') === normalizeLookupKey(normalized)
    }
    return false
  })
}

export const resolveReferenceId = async (endpoint: ReferenceEndpoint, name: string) => {
  const response = await http.get<ApiResponse<ServerTaxonomyList>>(endpoint, { params: { limit: 200 } })
  const items = response.data.data.items
  const found = findReference(items, name, endpoint)
  if (!found) {
    throw new Error(`Không tìm thấy "${name}" trong ${endpoint}`)
  }
  return Number(found.id)
}

/** Tìm size/màu; nếu chưa có thì tự tạo (phù hợp form thêm giày). */
export const resolveOrCreateReferenceId = async (
  endpoint: '/sizes' | '/colors',
  rawValue: string,
): Promise<number> => {
  const value = endpoint === '/sizes' ? normalizeSizeLabel(rawValue) : rawValue.trim()
  if (!value) {
    throw new Error(endpoint === '/sizes' ? 'Kích cỡ là bắt buộc' : 'Màu sắc là bắt buộc')
  }

  const response = await http.get<ApiResponse<ServerTaxonomyList>>(endpoint, { params: { limit: 200 } })
  const items = response.data.data.items
  const found = findReference(items, value, endpoint)
  if (found) return Number(found.id)

  if (endpoint === '/sizes') {
    const sortOrder = /^\d+$/.test(value) ? Number(value) : 0
    const created = await http.post<ApiResponse<ServerReferenceItem>>('/sizes', {
      label: value,
      sortOrder,
    })
    return Number(created.data.data.id)
  }

  const colorName = capitalizeWord(value)
  const created = await http.post<ApiResponse<ServerReferenceItem>>('/colors', {
    name: colorName,
    sortOrder: 0,
  })
  return Number(created.data.data.id)
}

export const toServerInventoryTransactionType = (type: InventoryAdjustmentRequest['type']): InventoryTxType => {
  if (type === 'import') return 'IN'
  if (type === 'export') return 'OUT'
  return 'ADJUSTMENT'
}

export const toClientInventoryType = (type: InventoryTxType): InventoryLog['type'] => {
  if (type === 'IN') return 'import'
  if (type === 'OUT') return 'export'
  return 'adjust'
}
