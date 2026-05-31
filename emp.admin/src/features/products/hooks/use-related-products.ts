import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'

export const useRelatedProducts = (id: string) =>
  useQuery({
    queryKey: ['related-products', id],
    queryFn: () => productsApi.getRelatedProducts(id),
    enabled: !!id,
  })
