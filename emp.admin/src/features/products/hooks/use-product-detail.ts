import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'

export const useProductDetail = (id: string) => {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => productsApi.getProduct(id),
    enabled: !!id,
  })
}