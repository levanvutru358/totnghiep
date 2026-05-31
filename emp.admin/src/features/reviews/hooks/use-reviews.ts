import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { reviewsApi } from '../services/reviews.api'
import type { ReviewFilters } from '../types/review.type'

export const useAdminReviews = (filters: ReviewFilters) =>
  useQuery({
    queryKey: ['admin-reviews', filters],
    queryFn: () => reviewsApi.list(filters),
  })

export const useReviewMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-reviews'] })

  return {
    hide: useMutation({ mutationFn: ({ id, note }: { id: number; note?: string }) => reviewsApi.hide(id, note), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number) => reviewsApi.remove(id), onSuccess: invalidate }),
  }
}
