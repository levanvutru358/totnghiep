import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { commentsApi } from '../services/comments.api'
import type { CommentFilters } from '../types/comment.type'

export const useAdminComments = (filters: CommentFilters) =>
  useQuery({
    queryKey: ['admin-comments', filters],
    queryFn: () => commentsApi.list(filters),
  })

export const useCommentMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-comments'] })

  return {
    hide: useMutation({ mutationFn: (id: number) => commentsApi.hide(id), onSuccess: invalidate }),
    show: useMutation({ mutationFn: (id: number) => commentsApi.show(id), onSuccess: invalidate }),
    remove: useMutation({ mutationFn: (id: number) => commentsApi.remove(id), onSuccess: invalidate }),
  }
}
