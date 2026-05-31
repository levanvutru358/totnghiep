import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../services/settings.api'
import type { ShopSettings } from '../types/shop-settings.type'

export const SETTINGS_QUERY_KEY = ['admin', 'shop-settings'] as const

export const useShopSettings = () =>
  useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: () => settingsApi.get(),
  })

export const useUpdateShopSettings = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ShopSettings) => settingsApi.update(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, data)
    },
  })
}
