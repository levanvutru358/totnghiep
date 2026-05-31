import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'
import type { AddressFormInput, UserAddress } from '../types/address.type'

type ApiRecord = Record<string, unknown>

const mapAddress = (row: ApiRecord): UserAddress => ({
  id: Number(row.id),
  label: row.label == null ? null : String(row.label),
  recipientName: String(row.recipientName ?? row.recipient_name ?? ''),
  recipientPhone: String(row.recipientPhone ?? row.recipient_phone ?? ''),
  addressLine1: String(row.addressLine1 ?? row.address_line1 ?? ''),
  addressLine2:
    row.addressLine2 == null && row.address_line2 == null
      ? null
      : String(row.addressLine2 ?? row.address_line2 ?? ''),
  ward: row.ward == null ? null : String(row.ward),
  district: String(row.district ?? ''),
  province: String(row.province ?? ''),
  postalCode:
    row.postalCode == null && row.postal_code == null
      ? null
      : String(row.postalCode ?? row.postal_code ?? ''),
  country: String(row.country ?? 'VN'),
  isDefault: Boolean(row.isDefault ?? row.is_default),
  createdAt: String(row.createdAt ?? row.created_at ?? ''),
  updatedAt: String(row.updatedAt ?? row.updated_at ?? ''),
})

const toPayload = (form: AddressFormInput) => ({
  label: form.label.trim() || null,
  recipientName: form.recipientName.trim(),
  recipientPhone: form.recipientPhone.trim(),
  addressLine1: form.addressLine1.trim(),
  addressLine2: form.addressLine2.trim() || null,
  ward: form.ward.trim() || null,
  district: form.district.trim(),
  province: form.province.trim(),
  postalCode: form.postalCode.trim() || null,
  country: 'VN',
  isDefault: form.isDefault,
})

export const addressesApi = {
  list: async (): Promise<UserAddress[]> => {
    const response = await http.get<ApiResponse<ApiRecord[]>>('/users/me/addresses')
    const data = response.data.data
    return Array.isArray(data) ? data.map(mapAddress) : []
  },

  create: async (form: AddressFormInput): Promise<UserAddress> => {
    const response = await http.post<ApiResponse<ApiRecord>>('/users/me/addresses', toPayload(form))
    return mapAddress(response.data.data)
  },

  update: async (id: number, form: AddressFormInput): Promise<UserAddress> => {
    const response = await http.patch<ApiResponse<ApiRecord>>(
      `/users/me/addresses/${id}`,
      toPayload(form),
    )
    return mapAddress(response.data.data)
  },

  remove: async (id: number): Promise<void> => {
    await http.delete(`/users/me/addresses/${id}`)
  },
}
