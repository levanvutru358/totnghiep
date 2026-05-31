import { pool } from '../configs/database.config';

export type ShopSettingsRow = {
  id: number;
  shop_name: string;
  logo_url: string;
  support_phone: string | null;
  support_email: string | null;
  default_shipping_fee: number;
  free_shipping_min_subtotal: number;
  payment_payos_enabled: number;
  payment_zalopay_enabled: number;
  default_payment_provider: string;
  return_policy_text: string | null;
  shipping_policy_text: string | null;
  chatbot_enabled: number;
  registration_enabled: number;
  created_at: Date | string;
  updated_at: Date | string;
};

export type UpdateShopSettingsInput = {
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
};

const mapRow = (row: Record<string, unknown>): ShopSettingsRow => ({
  id: Number(row.id),
  shop_name: String(row.shop_name),
  logo_url: String(row.logo_url),
  support_phone: row.support_phone == null ? null : String(row.support_phone),
  support_email: row.support_email == null ? null : String(row.support_email),
  default_shipping_fee: Number(row.default_shipping_fee),
  free_shipping_min_subtotal: Number(row.free_shipping_min_subtotal),
  payment_payos_enabled: Number(row.payment_payos_enabled),
  payment_zalopay_enabled: Number(row.payment_zalopay_enabled),
  default_payment_provider: String(row.default_payment_provider),
  return_policy_text: row.return_policy_text == null ? null : String(row.return_policy_text),
  shipping_policy_text:
    row.shipping_policy_text == null ? null : String(row.shipping_policy_text),
  chatbot_enabled: Number(row.chatbot_enabled),
  registration_enabled: Number(row.registration_enabled),
  created_at: row.created_at as Date | string,
  updated_at: row.updated_at as Date | string,
});

export const shopSettingsRepository = {
  async get(): Promise<ShopSettingsRow | null> {
    const [rows] = await pool.query('SELECT * FROM shop_settings WHERE id = 1 LIMIT 1');
    const list = rows as Record<string, unknown>[];
    return list[0] ? mapRow(list[0]) : null;
  },

  async update(input: UpdateShopSettingsInput): Promise<ShopSettingsRow> {
    await pool.query(
      `UPDATE shop_settings SET
        shop_name = ?,
        logo_url = ?,
        support_phone = ?,
        support_email = ?,
        default_shipping_fee = ?,
        free_shipping_min_subtotal = ?,
        payment_payos_enabled = ?,
        payment_zalopay_enabled = ?,
        default_payment_provider = ?,
        return_policy_text = ?,
        shipping_policy_text = ?,
        chatbot_enabled = ?,
        registration_enabled = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1`,
      [
        input.shopName,
        input.logoUrl,
        input.supportPhone,
        input.supportEmail,
        input.defaultShippingFee,
        input.freeShippingMinSubtotal,
        input.paymentPayosEnabled ? 1 : 0,
        input.paymentZalopayEnabled ? 1 : 0,
        input.defaultPaymentProvider,
        input.returnPolicyText,
        input.shippingPolicyText,
        input.chatbotEnabled ? 1 : 0,
        input.registrationEnabled ? 1 : 0,
      ],
    );

    const row = await this.get();
    if (!row) throw new Error('SHOP_SETTINGS_NOT_FOUND');
    return row;
  },
};
