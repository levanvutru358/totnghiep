import { useQuery } from '@tanstack/react-query'
import { productsApi } from '../services/products.api'

export const useVariants = () =>
  useQuery({
    queryKey: ['variants'],
    queryFn: productsApi.getVariants,
  })
