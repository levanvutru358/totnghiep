import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'

interface UseProductsOptions {
  page?: number
  limit?: number
  search?: string
  category?: string
  brand?: string
  status?: string
}

export const useProducts = (options: UseProductsOptions = {}) => {
  return useQuery({
    queryKey: ['products', options],
    queryFn: () => productsApi.getProducts(options),
  })
}