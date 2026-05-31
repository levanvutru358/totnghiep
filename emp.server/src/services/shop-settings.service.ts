import { payOSConfig } from '../configs/payos.config';
import { getZaloPayIsConfigured } from '../configs/zalopay.config';
import {
  shopSettingsRepository,
  type ShopSettingsRow,
  type UpdateShopSettingsInput,
} from '../repositories/shop-settings.repository';
import { bumpPublicContentRevision } from './public-revision.service';

export type ShopSettingsDto = {
  shopName: string;
  logoUrl: string;
  supportPhone: string | null;
  supportEmail: string | null;
  defaultShippingFee: number;
  freeShippingMinSubtotal: number;
  paymentPayosEnabled: boolean;
  paymentZalopayEnabled: boolean;
  defaultPaymentProvider: 'PAYOS' | 'ZALOPAY';
  returnPolicyText: string | null;
  shippingPolicyText: string | null;
  chatbotEnabled: boolean;
  registrationEnabled: boolean;
  updatedAt: string | null;
};

const DEFAULTS: ShopSettingsDto = {
  shopName: 'DTT Shop',
  logoUrl: '/logo-dtt.png',
  supportPhone: null,
  supportEmail: null,
  defaultShippingFee: 12,
  freeShippingMinSubtotal: 200,
  paymentPayosEnabled: true,
  paymentZalopayEnabled: true,
  defaultPaymentProvider: 'PAYOS',
  returnPolicyText: null,
  shippingPolicyText: null,
  chatbotEnabled: true,
  registrationEnabled: true,
  updatedAt: null,
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const normalizeOptionalString = (value: unknown): string | null => {
  if (value === null || typeof value === 'undefined') return null;
  const trimmed = normalizeString(value);
  return trimmed.length > 0 ? trimmed : null;
};

const toNonNegative = (value: unknown, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed * 100) / 100;
};

const mapRow = (row: ShopSettingsRow): ShopSettingsDto => ({
  shopName: row.shop_name,
  logoUrl: row.logo_url,
  supportPhone: row.support_phone,
  supportEmail: row.support_email,
  defaultShippingFee: Number(row.default_shipping_fee),
  freeShippingMinSubtotal: Number(row.free_shipping_min_subtotal),
  paymentPayosEnabled: Boolean(row.payment_payos_enabled),
  paymentZalopayEnabled: Boolean(row.payment_zalopay_enabled),
  defaultPaymentProvider:
    String(row.default_payment_provider).toUpperCase() === 'ZALOPAY' ? 'ZALOPAY' : 'PAYOS',
  returnPolicyText: row.return_policy_text,
  shippingPolicyText: row.shipping_policy_text,
  chatbotEnabled: Boolean(row.chatbot_enabled),
  registrationEnabled: Boolean(row.registration_enabled),
  updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : null,
});

export const computeShippingFeeFromSettings = (
  subtotalCatalog: number,
  settings: Pick<ShopSettingsDto, 'defaultShippingFee' | 'freeShippingMinSubtotal'>,
): number => {
  if (subtotalCatalog <= 0) return 0;
  if (
    settings.freeShippingMinSubtotal > 0 &&
    subtotalCatalog >= settings.freeShippingMinSubtotal
  ) {
    return 0;
  }
  return settings.defaultShippingFee;
};

const parseUpdateBody = (body: Record<string, unknown>): UpdateShopSettingsInput => {
  const shopName = normalizeString(body.shopName ?? body.shop_name);
  const logoUrl = normalizeString(body.logoUrl ?? body.logo_url);
  if (!shopName) throw new Error('MISSING_SHOP_NAME');
  if (!logoUrl) throw new Error('MISSING_LOGO_URL');

  const defaultProviderRaw = normalizeString(
    body.defaultPaymentProvider ?? body.default_payment_provider,
  ).toUpperCase();
  const defaultPaymentProvider: 'PAYOS' | 'ZALOPAY' =
    defaultProviderRaw === 'ZALOPAY' ? 'ZALOPAY' : 'PAYOS';

  const paymentPayosEnabled = body.paymentPayosEnabled !== false && body.payment_payos_enabled !== 0;
  const paymentZalopayEnabled =
    body.paymentZalopayEnabled !== false && body.payment_zalopay_enabled !== 0;

  if (!paymentPayosEnabled && !paymentZalopayEnabled) {
    throw new Error('PAYMENT_GATEWAY_REQUIRED');
  }

  return {
    shopName,
    logoUrl,
    supportPhone: normalizeOptionalString(body.supportPhone ?? body.support_phone),
    supportEmail: normalizeOptionalString(body.supportEmail ?? body.support_email),
    defaultShippingFee: toNonNegative(
      body.defaultShippingFee ?? body.default_shipping_fee,
      DEFAULTS.defaultShippingFee,
    ),
    freeShippingMinSubtotal: toNonNegative(
      body.freeShippingMinSubtotal ?? body.free_shipping_min_subtotal,
      DEFAULTS.freeShippingMinSubtotal,
    ),
    paymentPayosEnabled: Boolean(paymentPayosEnabled),
    paymentZalopayEnabled: Boolean(paymentZalopayEnabled),
    defaultPaymentProvider,
    returnPolicyText: normalizeOptionalString(body.returnPolicyText ?? body.return_policy_text),
    shippingPolicyText: normalizeOptionalString(
      body.shippingPolicyText ?? body.shipping_policy_text,
    ),
    chatbotEnabled: body.chatbotEnabled !== false && body.chatbot_enabled !== 0,
    registrationEnabled: body.registrationEnabled !== false && body.registration_enabled !== 0,
  };
};

export const shopSettingsService = {
  async getPublic(): Promise<ShopSettingsDto> {
    const row = await shopSettingsRepository.get();
    return row ? mapRow(row) : { ...DEFAULTS };
  },

  async getAdmin(): Promise<ShopSettingsDto> {
    return this.getPublic();
  },

  async update(body: Record<string, unknown>): Promise<ShopSettingsDto> {
    const input = parseUpdateBody(body);
    const row = await shopSettingsRepository.update(input);
    await bumpPublicContentRevision();
    return mapRow(row);
  },

  async getShippingFeeForSubtotal(subtotalCatalog: number): Promise<number> {
    const settings = await this.getPublic();
    return computeShippingFeeFromSettings(subtotalCatalog, settings);
  },

  isPayosAvailable(settings: ShopSettingsDto): boolean {
    return settings.paymentPayosEnabled && payOSConfig.isConfigured;
  },

  isZalopayAvailable(settings: ShopSettingsDto): boolean {
    return settings.paymentZalopayEnabled && getZaloPayIsConfigured();
  },
};
