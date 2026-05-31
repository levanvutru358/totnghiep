import { isPromotionDiscountType, type PromotionDiscountType } from '../constants/promotions';
import {
  catalogToFullVnd,
  formatCatalogVnd,
  formatPromotionVnd,
  fullVndToCatalog,
} from '../lib/money-vnd';
import {
  promotionRepository,
  type CreatePromotionInput,
  type PromotionCodeRow,
  type UpdatePromotionInput,
} from '../repositories/promotion.repository';

const normalizeOptionalString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const normalizeString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const toNonNegativeNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const toPositiveNumber = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
};

const toMoney = (value: number): number => Math.round(value * 100) / 100;

const assertPromotionSchedulable = (row: PromotionCodeRow) => {
  if (!row.is_active) throw new Error('PROMOTION_INACTIVE');

  const now = Date.now();
  if (row.starts_at && row.starts_at.getTime() > now) {
    throw new Error('PROMOTION_NOT_STARTED');
  }
  if (row.ends_at && row.ends_at.getTime() < now) {
    throw new Error('PROMOTION_EXPIRED');
  }
};

const calculateDiscountAmount = (
  row: PromotionCodeRow,
  subtotal: number,
  shippingFee: number,
): { discountAmount: number; shippingFee: number } => {
  const subtotalVnd = catalogToFullVnd(subtotal);
  if (subtotalVnd < row.min_order_amount) {
    throw new Error('PROMOTION_MIN_ORDER_NOT_MET');
  }

  if (row.usage_limit != null && row.used_count >= row.usage_limit) {
    throw new Error('PROMOTION_USAGE_LIMIT_REACHED');
  }

  if (row.discount_type === 'FREE_SHIPPING') {
    return {
      discountAmount: 0,
      shippingFee: 0,
    };
  }

  if (row.discount_type === 'FIXED') {
    const discountVnd = Math.min(subtotalVnd, row.discount_value);
    return {
      discountAmount: toMoney(fullVndToCatalog(discountVnd)),
      shippingFee,
    };
  }

  const rawPercentVnd = (subtotalVnd * row.discount_value) / 100;
  const cappedVnd =
    row.max_discount_amount != null
      ? Math.min(rawPercentVnd, row.max_discount_amount)
      : rawPercentVnd;

  return {
    discountAmount: toMoney(fullVndToCatalog(Math.min(subtotalVnd, cappedVnd))),
    shippingFee,
  };
};

const formatPromotionMoney = formatPromotionVnd;

const buildPromotionDisplay = (row: PromotionCodeRow) => {
  if (row.discount_type === 'FREE_SHIPPING') {
    return {
      chipLabel: 'FREESHIP',
      summaryTitle: row.name,
      shortDesc: row.description ?? `Đơn từ ${formatPromotionMoney(row.min_order_amount)}`,
    };
  }
  if (row.discount_type === 'PERCENT') {
    const cap =
      row.max_discount_amount != null
        ? `, tối đa ${formatPromotionMoney(row.max_discount_amount)}`
        : '';
    return {
      chipLabel: `-${row.discount_value}%`,
      summaryTitle: row.name,
      shortDesc: row.description ?? `Đơn từ ${formatPromotionMoney(row.min_order_amount)}${cap}`,
    };
  }
  return {
    chipLabel: `GIẢM ${row.discount_value >= 1000 ? `${Math.round(row.discount_value / 1000)}K` : formatPromotionMoney(row.discount_value)}`,
    summaryTitle: row.name,
    shortDesc: row.description ?? `Đơn từ ${formatPromotionMoney(row.min_order_amount)}`,
  };
};

const serializePromotion = (row: PromotionCodeRow) => ({
  id: row.id,
  code: row.code,
  name: row.name,
  description: row.description,
  discountType: row.discount_type,
  discountValue: row.discount_value,
  maxDiscountAmount: row.max_discount_amount,
  minOrderAmount: row.min_order_amount,
  usageLimit: row.usage_limit,
  usageLimitPerUser: row.usage_limit_per_user,
  usedCount: row.used_count,
  startsAt: row.starts_at,
  endsAt: row.ends_at,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const parseCreateInput = (body: Record<string, unknown>): CreatePromotionInput => {
  const code = normalizeString(body.code);
  const name = normalizeString(body.name);
  const discountType = body.discountType;

  if (!code) throw new Error('MISSING_CODE');
  if (!name) throw new Error('MISSING_NAME');
  if (!isPromotionDiscountType(discountType)) throw new Error('INVALID_DISCOUNT_TYPE');

  return {
    code,
    name,
    description: normalizeOptionalString(body.description),
    discountType,
    discountValue: toNonNegativeNumber(body.discountValue, 0),
    maxDiscountAmount:
      body.maxDiscountAmount == null ? null : toNonNegativeNumber(body.maxDiscountAmount, 0),
    minOrderAmount: toNonNegativeNumber(body.minOrderAmount, 0),
    usageLimit: body.usageLimit == null ? null : toPositiveNumber(body.usageLimit),
    usageLimitPerUser:
      body.usageLimitPerUser == null ? null : toPositiveNumber(body.usageLimitPerUser),
    startsAt: body.startsAt ? new Date(String(body.startsAt)) : null,
    endsAt: body.endsAt ? new Date(String(body.endsAt)) : null,
    isActive: body.isActive !== false,
  };
};

export const buildCheckoutPromotionNotice = (
  errorCode: string,
  subtotal: number,
  row?: PromotionCodeRow | null,
): string | null => {
  switch (errorCode) {
    case 'PROMOTION_MIN_ORDER_NOT_MET':
      return `Đơn tối thiểu ${formatPromotionVnd(Number(row?.min_order_amount ?? 0))}. Tạm tính hiện tại: ${formatCatalogVnd(subtotal)}.`;
    case 'PROMOTION_NOT_FOUND':
      return 'Mã khuyến mãi không tồn tại.';
    case 'PROMOTION_INACTIVE':
      return 'Mã khuyến mãi đã ngừng áp dụng.';
    case 'PROMOTION_EXPIRED':
      return 'Mã khuyến mãi đã hết hạn.';
    case 'PROMOTION_NOT_STARTED':
      return 'Mã khuyến mãi chưa có hiệu lực.';
    case 'PROMOTION_USAGE_LIMIT_REACHED':
      return 'Mã khuyến mãi đã hết lượt sử dụng.';
    case 'PROMOTION_USER_LIMIT_REACHED':
      return 'Bạn đã dùng hết lượt cho mã này.';
    default:
      return null;
  }
};

export const promotionService = {
  async listAvailableForShop() {
    const rows = await promotionRepository.listAvailableForShop(30);
    return {
      items: rows.map((row) => {
        const display = buildPromotionDisplay(row);
        return {
          ...serializePromotion(row),
          chipLabel: display.chipLabel,
          summaryTitle: display.summaryTitle,
          shortDesc: display.shortDesc,
          alreadyUsed: false,
        };
      }),
    };
  },

  async listAvailableForUser(userId: number) {
    const rows = await promotionRepository.listAvailableForUser(userId, 30);
    return {
      items: rows.map((row) => {
        const display = buildPromotionDisplay(row);
        return {
          ...serializePromotion(row),
          chipLabel: display.chipLabel,
          summaryTitle: display.summaryTitle,
          shortDesc: display.shortDesc,
          alreadyUsed: row.alreadyUsed,
        };
      }),
    };
  },

  async list(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 20, 100);
    const search = normalizeOptionalString(query.search) ?? undefined;
    const isActive =
      query.isActive === 'true' ? true : query.isActive === 'false' ? false : undefined;

    const result = await promotionRepository.list({
      search,
      isActive,
      page,
      limit,
    });

    return {
      ...result,
      items: result.items.map(serializePromotion),
    };
  },

  async detail(id: number) {
    const row = await promotionRepository.findById(id);
    if (!row) throw new Error('PROMOTION_NOT_FOUND');
    return serializePromotion(row);
  },

  async create(body: Record<string, unknown>) {
    const input = parseCreateInput(body);
    const existing = await promotionRepository.findByCode(input.code);
    if (existing) throw new Error('PROMOTION_CODE_EXISTS');
    const row = await promotionRepository.create(input);
    return serializePromotion(row);
  },

  async update(id: number, body: Record<string, unknown>) {
    const patch: UpdatePromotionInput = {};

    if (typeof body.code === 'string') patch.code = body.code;
    if (typeof body.name === 'string') patch.name = body.name;
    if (typeof body.description !== 'undefined') {
      patch.description = normalizeOptionalString(body.description);
    }
    if (isPromotionDiscountType(body.discountType)) patch.discountType = body.discountType;
    if (typeof body.discountValue !== 'undefined') {
      patch.discountValue = toNonNegativeNumber(body.discountValue, 0);
    }
    if (typeof body.maxDiscountAmount !== 'undefined') {
      patch.maxDiscountAmount =
        body.maxDiscountAmount == null
          ? null
          : toNonNegativeNumber(body.maxDiscountAmount, 0);
    }
    if (typeof body.minOrderAmount !== 'undefined') {
      patch.minOrderAmount = toNonNegativeNumber(body.minOrderAmount, 0);
    }
    if (typeof body.usageLimit !== 'undefined') {
      patch.usageLimit = body.usageLimit == null ? null : toPositiveNumber(body.usageLimit);
    }
    if (typeof body.usageLimitPerUser !== 'undefined') {
      patch.usageLimitPerUser =
        body.usageLimitPerUser == null ? null : toPositiveNumber(body.usageLimitPerUser);
    }
    if (typeof body.startsAt !== 'undefined') {
      patch.startsAt = body.startsAt ? new Date(String(body.startsAt)) : null;
    }
    if (typeof body.endsAt !== 'undefined') {
      patch.endsAt = body.endsAt ? new Date(String(body.endsAt)) : null;
    }
    if (typeof body.isActive === 'boolean') patch.isActive = body.isActive;

    if (patch.code) {
      const existing = await promotionRepository.findByCode(patch.code);
      if (existing && existing.id !== id) throw new Error('PROMOTION_CODE_EXISTS');
    }

    const row = await promotionRepository.update(id, patch);
    return serializePromotion(row);
  },

  async remove(id: number) {
    await promotionRepository.remove(id);
    return { id };
  },

  async validateForCheckout(body: Record<string, unknown>, userId: number) {
    const code = normalizeString(body.code ?? body.voucherCode);
    if (!code) throw new Error('MISSING_CODE');

    const subtotal = toNonNegativeNumber(body.subtotal, 0);
    const shippingFee = toNonNegativeNumber(body.shippingFee, 0);

    return this.resolveForCheckout({ code, userId, subtotal, shippingFee });
  },

  async resolveForCheckout(input: {
    code: string;
    userId: number;
    subtotal: number;
    shippingFee: number;
  }) {
    const row = await promotionRepository.findByCode(input.code);
    if (!row) throw new Error('PROMOTION_NOT_FOUND');

    assertPromotionSchedulable(row);

    const [usageFromTracking, usageFromOrders] = await Promise.all([
      promotionRepository.countUserUsages(row.id, input.userId),
      promotionRepository.countUserOrderUsagesByCode(row.code, input.userId),
    ]);
    const userUsage = Math.max(usageFromTracking, usageFromOrders);
    const perUserLimit = row.usage_limit_per_user ?? 1;
    if (userUsage >= perUserLimit) {
      throw new Error('PROMOTION_USER_LIMIT_REACHED');
    }

    const { discountAmount, shippingFee } = calculateDiscountAmount(
      row,
      input.subtotal,
      input.shippingFee,
    );

    const totalAmount = toMoney(input.subtotal + shippingFee - discountAmount);
    if (totalAmount < 0) throw new Error('INVALID_ORDER_TOTAL');

    return {
      promotionId: row.id,
      code: row.code,
      name: row.name,
      discountType: row.discount_type as PromotionDiscountType,
      discountAmount,
      shippingFee,
      subtotal: input.subtotal,
      totalAmount,
    };
  },

  async recordOrderUsage(promotionId: number, userId: number, orderId: number) {
    await promotionRepository.recordUsage(promotionId, userId, orderId);
  },
};
