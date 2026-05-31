import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { marketingApi } from '../services/marketing.api'
import type {
  MarketingBannerFormInput,
  MarketingHomeSectionCode,
  MarketingHomeSectionFormInput,
  MarketingSectionProductFormInput,
} from '../types/marketing.type'

export const useMarketingBanners = () =>
  useQuery({
    queryKey: ['admin-marketing-banners'],
    queryFn: () => marketingApi.listBanners(),
  })

export const useMarketingHomeSections = () =>
  useQuery({
    queryKey: ['admin-marketing-home-sections'],
    queryFn: () => marketingApi.listHomeSections(),
  })

export const useMarketingSectionProducts = (section: MarketingHomeSectionCode) =>
  useQuery({
    queryKey: ['admin-marketing-section-products', section],
    queryFn: () => marketingApi.listSectionProducts(section),
  })

export const useMarketingBannerMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-marketing-banners'] })

  return {
    create: useMutation({
      mutationFn: (body: MarketingBannerFormInput) => marketingApi.createBanner(body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: MarketingBannerFormInput }) =>
        marketingApi.updateBanner(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => marketingApi.removeBanner(id),
      onSuccess: invalidate,
    }),
  }
}

export const useMarketingHomeSectionMutations = () => {
  const queryClient = useQueryClient()
  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-marketing-home-sections'] })

  return {
    update: useMutation({
      mutationFn: ({ code, body }: { code: MarketingHomeSectionCode; body: MarketingHomeSectionFormInput }) =>
        marketingApi.updateHomeSection(code, body),
      onSuccess: invalidate,
    }),
  }
}

export const useMarketingSectionProductMutations = (section: MarketingHomeSectionCode) => {
  const queryClient = useQueryClient()
  const invalidate = () =>
    void queryClient.invalidateQueries({ queryKey: ['admin-marketing-section-products', section] })

  return {
    create: useMutation({
      mutationFn: (body: MarketingSectionProductFormInput) => marketingApi.createSectionProduct(section, body),
      onSuccess: invalidate,
    }),
    update: useMutation({
      mutationFn: ({ id, body }: { id: number; body: MarketingSectionProductFormInput }) =>
        marketingApi.updateSectionProduct(id, body),
      onSuccess: invalidate,
    }),
    remove: useMutation({
      mutationFn: (id: number) => marketingApi.removeSectionProduct(id),
      onSuccess: invalidate,
    }),
  }
}
