import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { categoryBrandApi } from '../services/category-brand.api'
import type { TaxonomyItem } from '../utils/category-brand.util'

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: categoryBrandApi.getCategories,
  })

export const useBrands = () =>
  useQuery({
    queryKey: ['brands'],
    queryFn: categoryBrandApi.getBrands,
  })

export const useCategoryMutations = () => {
  const queryClient = useQueryClient()

  const syncCategories = async (created?: TaxonomyItem) => {
    if (created) {
      queryClient.setQueryData<TaxonomyItem[]>(['categories'], (old) => {
        if (!old?.length) return [created]
        if (old.some((item) => item.id === created.id)) return old
        return [...old, created]
      })
    }
    await queryClient.invalidateQueries({ queryKey: ['categories'] })
    await queryClient.refetchQueries({ queryKey: ['categories'] })
  }

  const createCategory = useMutation({
    mutationFn: categoryBrandApi.createCategory,
    onSuccess: (created) => {
      void syncCategories(created)
    },
  })

  const updateCategory = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => categoryBrandApi.updateCategory(id, name),
    onSuccess: () => {
      void syncCategories()
    },
  })

  const deleteCategory = useMutation({
    mutationFn: (id: string) => categoryBrandApi.deleteCategory(id),
    onSuccess: () => {
      void syncCategories()
    },
  })

  return { createCategory, updateCategory, deleteCategory }
}

export const useBrandMutations = () => {
  const queryClient = useQueryClient()

  const createBrand = useMutation({
    mutationFn: (name: string) => categoryBrandApi.createBrand(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })

  const deleteBrand = useMutation({
    mutationFn: (id: string) => categoryBrandApi.deleteBrand(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] })
    },
  })

  return { createBrand, deleteBrand }
}
