import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'
import type { InventoryAdjustmentRequest, InventoryLogFilters, InventoryTransactionUpdateRequest } from '../types/product.type'

const syncInventoryQueries = async (queryClient: ReturnType<typeof useQueryClient>) => {
  await queryClient.invalidateQueries({ queryKey: ['products'] })
  await queryClient.invalidateQueries({ queryKey: ['product'] })
  await queryClient.invalidateQueries({ queryKey: ['variants'] })
  await queryClient.invalidateQueries({ queryKey: ['inventory-logs'] })
  await queryClient.refetchQueries({ queryKey: ['variants'] })
}

export const useInventoryLogs = (filters: InventoryLogFilters = {}) =>
  useQuery({
    queryKey: ['inventory-logs', filters],
    queryFn: () => productsApi.getInventoryLogs(filters),
  })

export const useInventoryAdjustment = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (payload: InventoryAdjustmentRequest) => productsApi.adjustInventory(payload),
    onSuccess: () => {
      void syncInventoryQueries(queryClient)
    },
  })
}

export const useInventoryTransactionMutations = () => {
  const queryClient = useQueryClient()

  const updateTransaction = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: InventoryTransactionUpdateRequest }) =>
      productsApi.updateInventoryTransaction(id, payload),
    onSuccess: () => {
      void syncInventoryQueries(queryClient)
    },
  })

  const deleteTransaction = useMutation({
    mutationFn: (id: string) => productsApi.deleteInventoryTransaction(id),
    onSuccess: () => {
      void syncInventoryQueries(queryClient)
    },
  })

  return { updateTransaction, deleteTransaction }
}
