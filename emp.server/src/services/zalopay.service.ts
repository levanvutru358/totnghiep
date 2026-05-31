import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { getZaloPayIsConfigured, zaloPayConfig } from '../configs/zalopay.config';

export interface ZaloPayCreateOrderInput {
  appTransId: string;
  amount: number;
  appUser: string;
  description: string;
  embedData: Record<string, unknown>;
  items: Array<{ id: string; amount: number }>;
  bankCode?: string;
}

export interface ZaloPayCreateOrderData {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  zp_trans_token?: string;
  order_url?: string;
  order_token?: string;
}

export interface ZaloPayQueryOrderData {
  return_code: number;
  return_message: string;
  sub_return_code?: number;
  sub_return_message?: string;
  is_processing?: boolean;
  amount?: number;
  zp_trans_id?: number;
}

export interface ZaloPayCallbackPayload {
  data: string;
  mac: string;
  type?: number;
}

export interface ZaloPayCallbackData {
  app_id?: number;
  app_trans_id?: string;
  app_time?: number;
  app_user?: string;
  amount?: number;
  zp_trans_id?: number;
  server_time?: number;
  channel?: number;
  merchant_user_id?: string;
  user_fee_amount?: number;
  discount_amount?: number;
  status?: number;
  [key: string]: unknown;
}

const ensureConfigured = () => {
  if (!getZaloPayIsConfigured()) {
    throw new Error('ZALOPAY_NOT_CONFIGURED');
  }
};

const hmacSha256Hex = (key: string, data: string): string =>
  crypto.createHmac('sha256', key).update(data, 'utf8').digest('hex');

const pad2 = (value: number) => String(value).padStart(2, '0');

export const generateZaloPayAppTransId = (orderId: number): string => {
  const now = new Date();
  const datePart = `${String(now.getFullYear()).slice(2)}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const suffix = `${orderId}${String(now.getTime()).slice(-8)}`;
  return `${datePart}_${suffix}`.slice(0, 40);
};

export const buildCreateOrderMac = (input: {
  appId: string;
  appTransId: string;
  appUser: string;
  amount: number;
  appTime: number;
  embedData: string;
  item: string;
}): string => {
  const hmacInput = [
    input.appId,
    input.appTransId,
    input.appUser,
    String(input.amount),
    String(input.appTime),
    input.embedData,
    input.item,
  ].join('|');
  return hmacSha256Hex(zaloPayConfig.key1, hmacInput);
};

export const buildQueryOrderMac = (appId: string, appTransId: string): string =>
  hmacSha256Hex(zaloPayConfig.key1, `${appId}|${appTransId}|${zaloPayConfig.key1}`);

const postForm = <T>(path: string, body: Record<string, string>): Promise<T> =>
  new Promise((resolve, reject) => {
    const url = new URL(`${zaloPayConfig.baseUrl}${path}`);
    const payload = new URLSearchParams(body).toString();
    const transport = url.protocol === 'https:' ? https : http;

    const request = transport.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(payload),
        },
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        response.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error(`ZALOPAY_INVALID_RESPONSE:${raw.slice(0, 200)}`));
          }
        });
      },
    );

    request.on('error', (error) => {
      reject(new Error(`ZALOPAY_TRANSPORT_ERROR:${error.message}`));
    });
    request.write(payload);
    request.end();
  });

export const zaloPayService = {
  createOrder(input: ZaloPayCreateOrderInput): Promise<ZaloPayCreateOrderData> {
    ensureConfigured();

    const appTime = Date.now();
    const embedData = JSON.stringify(input.embedData);
    const item = JSON.stringify(input.items);
    const appId = zaloPayConfig.appId;

    const mac = buildCreateOrderMac({
      appId,
      appTransId: input.appTransId,
      appUser: input.appUser,
      amount: input.amount,
      appTime,
      embedData,
      item,
    });

    const body: Record<string, string> = {
      app_id: appId,
      app_user: input.appUser.slice(0, 50),
      app_trans_id: input.appTransId,
      app_time: String(appTime),
      amount: String(input.amount),
      item,
      embed_data: embedData,
      description: input.description.slice(0, 256),
      callback_url: zaloPayConfig.webhookUrl,
      mac,
    };

    if (input.bankCode) {
      body.bank_code = input.bankCode;
    }

    return postForm<ZaloPayCreateOrderData>('/v2/create', body);
  },

  queryOrder(appTransId: string): Promise<ZaloPayQueryOrderData> {
    ensureConfigured();
    const appId = zaloPayConfig.appId;
    const mac = buildQueryOrderMac(appId, appTransId);

    return postForm<ZaloPayQueryOrderData>('/v2/query', {
      app_id: appId,
      app_trans_id: appTransId,
      mac,
    });
  },

  verifyCallback(payload: ZaloPayCallbackPayload): boolean {
    ensureConfigured();
    if (!payload.data || !payload.mac) return false;
    const expected = hmacSha256Hex(zaloPayConfig.key2, payload.data);
    return expected === payload.mac;
  },

  parseCallbackData(payload: ZaloPayCallbackPayload): ZaloPayCallbackData {
    if (!payload.data) throw new Error('ZALOPAY_CALLBACK_INVALID_BODY');
    try {
      return JSON.parse(payload.data) as ZaloPayCallbackData;
    } catch {
      throw new Error('ZALOPAY_CALLBACK_INVALID_BODY');
    }
  },
};
