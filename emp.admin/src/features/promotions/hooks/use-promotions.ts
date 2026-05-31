import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { promotionsApi } from '../services/promotions.api'
import type { PromotionFilters, PromotionFormInput } from '../types/promotion.type'

export const useAdminPromotions = (filters: PromotionFilters) =>
  useQuery({
    queryKey: ['admin-promotions', filters],
    queryFn: () => promotionsApi.list(filters),
  })

export const usePromotionMutations = () => {
  const queryClient = useQueryClient()

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ['admin-promotions'] })
  }

  const create = useMutation({
    mutationFn: (body: PromotionFormInput) => promotionsApi.create(body),
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: Partial<PromotionFormInput> }) =>
      promotionsApi.update(id, body),
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: (id: number) => promotionsApi.remove(id),
    onSuccess: invalidate,
  })

  return { create, update, remove }
}
