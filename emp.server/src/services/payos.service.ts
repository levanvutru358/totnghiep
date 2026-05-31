import * as crypto from 'crypto';
import * as http from 'http';
import * as https from 'https';
import { payOSConfig } from '../configs/payos.config';

interface PayOSItemInput {
  name: string;
  quantity: number;
  price: number;
  unit?: string;
}

export interface PayOSCreatePaymentLinkInput {
  orderCode: number;
  amount: number;
  description: string;
  buyerName?: string;
  buyerEmail?: string;
  buyerPhone?: string;
  buyerAddress?: string;
  items?: PayOSItemInput[];
  returnUrl?: string;
  cancelUrl?: string;
  expiredAt?: number;
}

export interface PayOSPaymentLinkData {
  id?: string;
  paymentLinkId?: string;
  orderCode?: number;
  amount?: number;
  amountPaid?: number;
  amountRemaining?: number;
  status?: string;
  checkoutUrl?: string;
  qrCode?: string;
  description?: string;
  currency?: string;
  createdAt?: string;
  canceledAt?: string;
  cancellationReason?: string;
  transactions?: unknown;
  [key: string]: unknown;
}

export interface PayOSApiResponse<T> {
  code?: string;
  desc?: string;
  data?: T;
  signature?: string;
}

export interface PayOSWebhookBody {
  code?: string;
  desc?: string;
  success?: boolean;
  data?: Record<string, unknown>;
  signature?: string;
}

const ensureConfigured = () => {
  if (!payOSConfig.isConfigured) {
    throw new Error('PAYOS_NOT_CONFIGURED');
  }
};

const createSignature = (secret: string, data: string): string =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

const normalizeSignatureValue = (value: unknown): string => {
  if (
    value === null ||
    typeof value === 'undefined' ||
    value === 'null' ||
    value === 'undefined'
  ) {
    return '';
  }

  if (Array.isArray(value)) {
    return JSON.stringify(
      value.map((item) =>
        item && typeof item === 'object' && !Array.isArray(item)
          ? sortObjectKeys(item as Record<string, unknown>)
          : item,
      ),
    );
  }

  if (value && typeof value === 'object') {
    return JSON.stringify(sortObjectKeys(value as Record<string, unknown>));
  }

  return String(value);
};

const sortObjectKeys = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.keys(value)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      accumulator[key] = value[key];
      return accumulator;
    }, {});

const toSignaturePayload = (value: Record<string, unknown>): string =>
  Object.keys(sortObjectKeys(value))
    .filter((key) => typeof value[key] !== 'undefined')
    .map((key) => `${key}=${normalizeSignatureValue(value[key])}`)
    .join('&');

const requestJson = <T>(
  method: 'GET' | 'POST',
  urlString: string,
  body?: Record<string, unknown>,
): Promise<T> =>
  new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const payload = body ? JSON.stringify(body) : '';
    const transport = url.protocol === 'http:' ? http : https;

    const headers: Record<string, string | number> = {
      Accept: 'application/json',
      'x-client-id': payOSConfig.clientId,
      'x-api-key': payOSConfig.apiKey,
    };

    if (payOSConfig.partnerCode) {
      headers['x-partner-code'] = payOSConfig.partnerCode;
    }

    if (body) {
      headers['Content-Type'] = 'application/json';
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const request = transport.request(
      {
        method,
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        headers,
      },
      (response) => {
        let raw = '';
        response.setEncoding('utf8');

        response.on('data', (chunk) => {
          raw += chunk;
        });

        response.on('end', () => {
          const statusCode = response.statusCode ?? 500;
          if (statusCode >= 400) {
            const trimmed = raw.trim();
            const detail = trimmed.length > 0 ? `HTTP ${statusCode} - ${trimmed}` : `HTTP ${statusCode}`;
            reject(new Error(`PAYOS_TRANSPORT_ERROR:${detail}`));
            return;
          }

          try {
            resolve(JSON.parse(raw) as T);
          } catch {
            reject(new Error('PAYOS_INVALID_RESPONSE'));
          }
        });
      },
    );

    request.on('error', (error) => {
      const detail =
        error instanceof Error && error.message.trim().length > 0
          ? error.message.trim()
          : 'request failed';
      reject(new Error(`PAYOS_TRANSPORT_ERROR:${detail}`));
    });

    if (payload) {
      request.write(payload);
    }

    request.end();
  });

export const payOSService = {
  createRequestSignature(payload: {
    amount: number;
    cancelUrl: string;
    description: string;
    orderCode: number;
    returnUrl: string;
  }): string {
    ensureConfigured();
    return createSignature(payOSConfig.checksumKey, toSignaturePayload(payload));
  },

  async createPaymentLink(
    input: PayOSCreatePaymentLinkInput,
  ): Promise<PayOSApiResponse<PayOSPaymentLinkData>> {
    ensureConfigured();

    const cancelUrl = input.cancelUrl ?? payOSConfig.cancelUrl;
    const returnUrl = input.returnUrl ?? payOSConfig.returnUrl;
    const signature = this.createRequestSignature({
      amount: input.amount,
      cancelUrl,
      description: input.description,
      orderCode: input.orderCode,
      returnUrl,
    });

    return requestJson<PayOSApiResponse<PayOSPaymentLinkData>>(
      'POST',
      `${payOSConfig.baseUrl}/v2/payment-requests`,
      {
        orderCode: input.orderCode,
        amount: input.amount,
        description: input.description,
        buyerName: input.buyerName,
        buyerEmail: input.buyerEmail,
        buyerPhone: input.buyerPhone,
        buyerAddress: input.buyerAddress,
        items: input.items,
        cancelUrl,
        returnUrl,
        expiredAt: input.expiredAt,
        signature,
      },
    );
  },

  async getPaymentLink(id: string): Promise<PayOSApiResponse<PayOSPaymentLinkData>> {
    ensureConfigured();
    return requestJson<PayOSApiResponse<PayOSPaymentLinkData>>(
      'GET',
      `${payOSConfig.baseUrl}/v2/payment-requests/${encodeURIComponent(id)}`,
    );
  },

  async cancelPaymentLink(
    id: string,
    cancellationReason?: string,
  ): Promise<PayOSApiResponse<PayOSPaymentLinkData>> {
    ensureConfigured();
    return requestJson<PayOSApiResponse<PayOSPaymentLinkData>>(
      'POST',
      `${payOSConfig.baseUrl}/v2/payment-requests/${encodeURIComponent(id)}/cancel`,
      {
        cancellationReason,
      },
    );
  },

  verifyWebhook(body: PayOSWebhookBody): boolean {
    ensureConfigured();
    if (!body.data || typeof body.data !== 'object' || typeof body.signature !== 'string') {
      return false;
    }
    const expectedSignature = createSignature(
      payOSConfig.checksumKey,
      toSignaturePayload(body.data),
    );
    return expectedSignature === body.signature;
  },

  parseWebhookData(body: PayOSWebhookBody): Record<string, unknown> {
    if (!body.data || typeof body.data !== 'object') {
      throw new Error('PAYOS_WEBHOOK_INVALID_BODY');
    }

    return body.data;
  },
};
