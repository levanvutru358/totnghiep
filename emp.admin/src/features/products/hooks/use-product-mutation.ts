import { useMutation, useQueryClient } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'
import type { CreateProductRequest } from '../types/product.type'
import { type ProductFormData } from '../schemas/product.schema'

type ProductMutationInput = ProductFormData &
  Pick<CreateProductRequest, 'imageFiles'> & { id?: string }

export const useProductMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: ProductMutationInput) => {
      if (data.id) {
        return productsApi.updateProduct(data.id, data)
      }
      return productsApi.createProduct(data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] })
      queryClient.invalidateQueries({ queryKey: ['product'] })
    },
  })
}