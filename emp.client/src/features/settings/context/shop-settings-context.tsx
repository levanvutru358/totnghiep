import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { BRAND_LOGO_ALT, BRAND_LOGO_SRC } from '../../../lib/brand'
import { DEFAULT_SHIPPING_CONFIG, type ShippingFeeConfig } from '../../../lib/shipping-fee'
import { shopSettingsApi } from '../services/shop-settings.api'
import type { ShopSettings } from '../types/shop-settings.type'

const defaultSettings: ShopSettings = {
  shopName: BRAND_LOGO_ALT,
  logoUrl: BRAND_LOGO_SRC,
  supportPhone: null,
  supportEmail: null,
  defaultShippingFee: DEFAULT_SHIPPING_CONFIG.defaultShippingFee,
  freeShippingMinSubtotal: DEFAULT_SHIPPING_CONFIG.freeShippingMinSubtotal,
  paymentPayosEnabled: true,
  paymentZalopayEnabled: true,
  defaultPaymentProvider: 'PAYOS',
  returnPolicyText: null,
  shippingPolicyText: null,
  chatbotEnabled: true,
  registrationEnabled: true,
  updatedAt: null,
}

type ShopSettingsContextValue = {
  settings: ShopSettings
  shippingConfig: ShippingFeeConfig
  loaded: boolean
  refresh: () => Promise<void>
}

const ShopSettingsContext = createContext<ShopSettingsContextValue>({
  settings: defaultSettings,
  shippingConfig: DEFAULT_SHIPPING_CONFIG,
  loaded: false,
  refresh: async () => undefined,
})

export const ShopSettingsProvider = ({ children }: { children: React.ReactNode }) => {
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const data = await shopSettingsApi.getPublic()
      setSettings(data)
    } catch {
      setSettings(defaultSettings)
    } finally {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const shippingConfig = useMemo(
    (): ShippingFeeConfig => ({
      defaultShippingFee: settings.defaultShippingFee,
      freeShippingMinSubtotal: settings.freeShippingMinSubtotal,
    }),
    [settings.defaultShippingFee, settings.freeShippingMinSubtotal],
  )

  const value = useMemo(
    () => ({ settings, shippingConfig, loaded, refresh }),
    [settings, shippingConfig, loaded, refresh],
  )

  return <ShopSettingsContext.Provider value={value}>{children}</ShopSettingsContext.Provider>
}

export const useShopSettings = () => useContext(ShopSettingsContext)
