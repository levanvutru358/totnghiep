import { http } from '../../../lib/http'
import type { ApiResponse } from '../../../types/api.type'
import type { ShopSettings } from '../types/shop-settings.type'

type ApiRecord = Record<string, unknown>

const toBool = (value: unknown, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (value === 1 || value === '1') return true
  if (value === 0 || value === '0') return false
  return fallback
}

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export const mapShopSettings = (row: ApiRecord): ShopSettings => ({
  shopName: String(row.shopName ?? row.shop_name ?? 'DTT Shop'),
  logoUrl: String(row.logoUrl ?? row.logo_url ?? '/logo-dtt.png'),
  supportPhone:
    row.supportPhone == null && row.support_phone == null
      ? null
      : String(row.supportPhone ?? row.support_phone ?? '').trim() || null,
  supportEmail:
    row.supportEmail == null && row.support_email == null
      ? null
      : String(row.supportEmail ?? row.support_email ?? '').trim() || null,
  defaultShippingFee: toNumber(row.defaultShippingFee ?? row.default_shipping_fee, 12),
  freeShippingMinSubtotal: toNumber(
    row.freeShippingMinSubtotal ?? row.free_shipping_min_subtotal,
    200,
  ),
  paymentPayosEnabled: toBool(row.paymentPayosEnabled ?? row.payment_payos_enabled, true),
  paymentZalopayEnabled: toBool(row.paymentZalopayEnabled ?? row.payment_zalopay_enabled, true),
  defaultPaymentProvider:
    String(row.defaultPaymentProvider ?? row.default_payment_provider ?? 'PAYOS').toUpperCase() ===
    'ZALOPAY'
      ? 'ZALOPAY'
      : 'PAYOS',
  returnPolicyText:
    row.returnPolicyText == null && row.return_policy_text == null
      ? null
      : String(row.returnPolicyText ?? row.return_policy_text ?? '').trim() || null,
  shippingPolicyText:
    row.shippingPolicyText == null && row.shipping_policy_text == null
      ? null
      : String(row.shippingPolicyText ?? row.shipping_policy_text ?? '').trim() || null,
  chatbotEnabled: toBool(row.chatbotEnabled ?? row.chatbot_enabled, true),
  registrationEnabled: toBool(row.registrationEnabled ?? row.registration_enabled, true),
  updatedAt: row.updatedAt ? String(row.updatedAt) : row.updated_at ? String(row.updated_at) : null,
})

export const shopSettingsApi = {
  getPublic: async (): Promise<ShopSettings> => {
    const response = await http.get<ApiResponse<ApiRecord>>('/public/shop-settings')
    return mapShopSettings(response.data.data ?? {})
  },
}
