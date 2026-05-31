import { http } from '../../../lib/axios'
import type { ApiResponse } from '../../../types/api.type'
import type {
  AdminCustomerDetail,
  AdminCustomerSummary,
  CustomerListFilters,
  CustomersListResponse,
} from '../types/customer.type'

export const customersApi = {
  list: async (params?: CustomerListFilters): Promise<CustomersListResponse> => {
    const response = await http.get<ApiResponse<CustomersListResponse>>('/admin/customers', { params })
    return response.data.data
  },

  detail: async (customerId: number): Promise<AdminCustomerDetail> => {
    const response = await http.get<ApiResponse<AdminCustomerDetail>>(`/admin/customers/${customerId}`)
    return response.data.data
  },

  update: async (
    customerId: number,
    payload: { fullName?: string | null },
  ): Promise<AdminCustomerSummary> => {
    const response = await http.patch<ApiResponse<AdminCustomerSummary>>(`/admin/customers/${customerId}`, payload)
    return response.data.data
  },

  lock: async (customerId: number, payload: { reason: string }): Promise<AdminCustomerSummary> => {
    const response = await http.post<ApiResponse<AdminCustomerSummary>>(`/admin/customers/${customerId}/lock`, payload)
    return response.data.data
  },

  tempLock: async (
    customerId: number,
    payload: { reason: string; lockedUntil?: string; durationHours?: number },
  ): Promise<AdminCustomerSummary> => {
    const response = await http.post<ApiResponse<AdminCustomerSummary>>(
      `/admin/customers/${customerId}/temp-lock`,
      payload,
    )
    return response.data.data
  },

  unlock: async (customerId: number): Promise<AdminCustomerSummary> => {
    const response = await http.post<ApiResponse<AdminCustomerSummary>>(`/admin/customers/${customerId}/unlock`, {})
    return response.data.data
  },
}
