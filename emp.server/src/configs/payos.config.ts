import { authConfig } from './auth.config';

const trimToUndefined = (value?: string): string | undefined => {
  const normalized = (value ?? '').trim();
  return normalized.length > 0 ? normalized : undefined;
};

const normalizeBaseUrl = (value: string): string => value.replace(/\/+$/, '');

const normalizePath = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) return '/';
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

const parseInteger = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.trunc(parsed);
};

const clampInteger = (value: number, min: number, max: number): number => {
  if (value < min) return min;
  if (value > max) return max;
  return value;
};

const serverPublicUrl = normalizeBaseUrl(
  trimToUndefined(process.env.SERVER_PUBLIC_URL) ??
    `http://localhost:${process.env.PORT ?? '8000'}`,
);

const webhookPath = normalizePath(
  trimToUndefined(process.env.PAYOS_WEBHOOK_PATH) ?? '/api/payments/callbacks/payos',
);

const returnPath = normalizePath(
  trimToUndefined(process.env.PAYOS_RETURN_PATH) ?? '/api/payments/return',
);

export const payOSConfig = {
  provider: 'PAYOS',
  clientId: trimToUndefined(process.env.PAYOS_CLIENT_ID) ?? '',
  apiKey: trimToUndefined(process.env.PAYOS_API_KEY) ?? '',
  checksumKey: trimToUndefined(process.env.PAYOS_CHECKSUM_KEY) ?? '',
  partnerCode: trimToUndefined(process.env.PAYOS_PARTNER_CODE),
  baseUrl: normalizeBaseUrl(
    trimToUndefined(process.env.PAYOS_BASE_URL) ?? 'https://api-merchant.payos.vn',
  ),
  webhookPath,
  returnPath,
  webhookUrl:
    trimToUndefined(process.env.PAYOS_WEBHOOK_URL) ?? `${serverPublicUrl}${webhookPath}`,
  returnUrl:
    trimToUndefined(process.env.PAYOS_RETURN_URL) ?? `${serverPublicUrl}${returnPath}`,
  resultUrl:
    trimToUndefined(process.env.PAYOS_RESULT_URL) ??
    `${authConfig.appPublicUrl.replace(/\/$/, '')}/checkout/result`,
  cancelUrl:
    trimToUndefined(process.env.PAYOS_CANCEL_URL) ??
    `${authConfig.appPublicUrl.replace(/\/$/, '')}/checkout/cancel`,
  expireDurationSeconds: clampInteger(
    parseInteger(process.env.PAYOS_EXPIRE_DURATION_SECONDS, 900),
    300,
    2592000,
  ),
  isConfigured: false,
};

payOSConfig.isConfigured =
  payOSConfig.clientId.length > 0 &&
  payOSConfig.apiKey.length > 0 &&
  payOSConfig.checksumKey.length > 0;
