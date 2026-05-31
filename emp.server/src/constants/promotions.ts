export const promotionDiscountTypes = ['FIXED', 'PERCENT', 'FREE_SHIPPING'] as const;

export type PromotionDiscountType = (typeof promotionDiscountTypes)[number];

export const isPromotionDiscountType = (value: unknown): value is PromotionDiscountType =>
  typeof value === 'string' &&
  promotionDiscountTypes.includes(value as PromotionDiscountType);
