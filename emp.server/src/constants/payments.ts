export const PAYMENT_TRANSACTION_STATUSES = [
  'PENDING',
  'PROCESSING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED',
  'EXPIRED',
  'REFUNDED',
] as const;

export type PaymentTransactionStatus = (typeof PAYMENT_TRANSACTION_STATUSES)[number];

export const isPaymentTransactionStatus = (
  value: unknown,
): value is PaymentTransactionStatus =>
  typeof value === 'string' &&
  PAYMENT_TRANSACTION_STATUSES.includes(value as PaymentTransactionStatus);
