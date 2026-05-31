export type ShopSettings = {
  shopName: string
  logoUrl: string
  supportPhone: string | null
  supportEmail: string | null
  defaultShippingFee: number
  freeShippingMinSubtotal: number
  paymentPayosEnabled: boolean
  paymentZalopayEnabled: boolean
  defaultPaymentProvider: 'PAYOS' | 'ZALOPAY'
  returnPolicyText: string | null
  shippingPolicyText: string | null
  chatbotEnabled: boolean
  registrationEnabled: boolean
  updatedAt: string | null
}

export type ShopSettingsFormInput = ShopSettings
