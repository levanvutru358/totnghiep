import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi } from '../services/customers.api'
import type { CustomerListFilters } from '../types/customer.type'

export const useAdminCustomers = (filters: CustomerListFilters = {}) =>
  useQuery({
    queryKey: ['admin-customers', filters],
    queryFn: () => customersApi.list(filters),
  })

export const useAdminCustomerDetail = (customerId: number | undefined) =>
  useQuery({
    queryKey: ['admin-customer', customerId],
    queryFn: () => customersApi.detail(customerId!),
    enabled: Boolean(customerId),
  })

export const useCustomerMutations = (customerId: number) => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-customer', customerId] })
    void queryClient.invalidateQueries({ queryKey: ['admin-customers'] })
  }

  const update = useMutation({
    mutationFn: (payload: { fullName?: string | null }) => customersApi.update(customerId, payload),
    onSuccess: invalidate,
  })

  const lock = useMutation({
    mutationFn: (payload: { reason: string }) => customersApi.lock(customerId, payload),
    onSuccess: invalidate,
  })

  const tempLock = useMutation({
    mutationFn: (payload: { reason: string; lockedUntil?: string; durationHours?: number }) =>
      customersApi.tempLock(customerId, payload),
    onSuccess: invalidate,
  })

  const unlock = useMutation({
    mutationFn: () => customersApi.unlock(customerId),
    onSuccess: invalidate,
  })

  return { update, lock, tempLock, unlock }
}
