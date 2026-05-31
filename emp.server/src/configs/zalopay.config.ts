import './env.config';
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
  trimToUndefined(process.env.ZALOPAY_WEBHOOK_PATH) ?? '/api/payments/callbacks/zalopay',
);

const returnPath = normalizePath(
  trimToUndefined(process.env.ZALOPAY_RETURN_PATH) ?? '/api/payments/return/zalopay',
);

const envName = (trimToUndefined(process.env.ZALOPAY_ENV) ?? 'sandbox').toLowerCase();
const isProduction = envName === 'production' || envName === 'prod';

export const zaloPayConfig = {
  provider: 'ZALOPAY',
  appId: trimToUndefined(process.env.ZALOPAY_APP_ID) ?? '',
  key1: trimToUndefined(process.env.ZALOPAY_KEY1) ?? '',
  key2: trimToUndefined(process.env.ZALOPAY_KEY2) ?? '',
  env: isProduction ? 'production' : 'sandbox',
  baseUrl: normalizeBaseUrl(
    trimToUndefined(process.env.ZALOPAY_BASE_URL) ??
      (isProduction ? 'https://openapi.zalopay.vn' : 'https://sb-openapi.zalopay.vn'),
  ),
  webhookPath,
  returnPath,
  webhookUrl:
    trimToUndefined(process.env.ZALOPAY_WEBHOOK_URL) ?? `${serverPublicUrl}${webhookPath}`,
  returnUrl:
    trimToUndefined(process.env.ZALOPAY_RETURN_URL) ?? `${serverPublicUrl}${returnPath}`,
  resultUrl:
    trimToUndefined(process.env.ZALOPAY_RESULT_URL) ??
    `${authConfig.appPublicUrl.replace(/\/$/, '')}/checkout/result`,
  cancelUrl:
    trimToUndefined(process.env.ZALOPAY_CANCEL_URL) ??
    `${authConfig.appPublicUrl.replace(/\/$/, '')}/checkout/cancel`,
  expireDurationSeconds: clampInteger(
    parseInteger(process.env.ZALOPAY_EXPIRE_DURATION_SECONDS, 900),
    300,
    2592000,
  ),
  isConfigured: false,
};

const isPlaceholderCredential = (value: string): boolean => {
  const normalized = value.trim().toLowerCase();
  return (
    normalized.length === 0 ||
    normalized.startsWith('your_') ||
    normalized === 'changeme' ||
    normalized === 'change-me'
  );
};

export const getZaloPayIsConfigured = (): boolean => {
  const appId = trimToUndefined(process.env.ZALOPAY_APP_ID) ?? '';
  const key1 = trimToUndefined(process.env.ZALOPAY_KEY1) ?? '';
  const key2 = trimToUndefined(process.env.ZALOPAY_KEY2) ?? '';

  return (
    appId.length > 0 &&
    key1.length > 0 &&
    key2.length > 0 &&
    !isPlaceholderCredential(key1) &&
    !isPlaceholderCredential(key2)
  );
};

zaloPayConfig.isConfigured = getZaloPayIsConfigured();
