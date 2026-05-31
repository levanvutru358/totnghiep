export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'COMPLETED',
  'CANCELLED',
  'RETURN_REQUESTED',
  'RETURNED',
  'REFUNDED',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_PAYMENT_STATUSES = [
  'UNPAID',
  'PAID',
  'PARTIALLY_REFUNDED',
  'REFUNDED',
  'FAILED',
] as const;

export type OrderPaymentStatus = (typeof ORDER_PAYMENT_STATUSES)[number];

export const ORDER_FULFILLMENT_STATUSES = [
  'UNFULFILLED',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'RETURNED',
  'CANCELLED',
] as const;

export type OrderFulfillmentStatus = (typeof ORDER_FULFILLMENT_STATUSES)[number];

export const ORDER_PAYMENT_METHODS = ['COD', 'BANK_TRANSFER', 'E_WALLET', 'CREDIT_CARD'] as const;

export type OrderPaymentMethod = (typeof ORDER_PAYMENT_METHODS)[number];

export const ENABLED_ORDER_PAYMENT_METHODS = ['E_WALLET'] as const;

export const DEFAULT_ORDER_PAYMENT_METHOD = 'E_WALLET' as const;

export const isOrderStatus = (value: unknown): value is OrderStatus =>
  typeof value === 'string' && ORDER_STATUSES.includes(value as OrderStatus);

export const isOrderPaymentStatus = (value: unknown): value is OrderPaymentStatus =>
  typeof value === 'string' && ORDER_PAYMENT_STATUSES.includes(value as OrderPaymentStatus);

export const isOrderFulfillmentStatus = (value: unknown): value is OrderFulfillmentStatus =>
  typeof value === 'string' &&
  ORDER_FULFILLMENT_STATUSES.includes(value as OrderFulfillmentStatus);

export const isOrderPaymentMethod = (value: unknown): value is OrderPaymentMethod =>
  typeof value === 'string' &&
  ENABLED_ORDER_PAYMENT_METHODS.includes(value as (typeof ENABLED_ORDER_PAYMENT_METHODS)[number]);
