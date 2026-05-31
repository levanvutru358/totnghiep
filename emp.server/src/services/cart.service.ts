import {
  DEFAULT_ORDER_PAYMENT_METHOD,
  isOrderPaymentMethod,
  type OrderPaymentMethod,
} from '../constants/orders';
import { UserRole } from '../constants/roles';
import { cartRepository, type AdminCartListFilters } from '../repositories/cart.repository';
import { orderRepository } from '../repositories/order.repository';
import { orderService } from './order.service';
import { paymentService } from './payment.service';
import { marketingRepository } from '../repositories/marketing.repository';
import { computeMarketingSalePrice } from './marketing.service';
import { buildCheckoutPromotionNotice, promotionService } from './promotion.service';
import { shopSettingsService } from './shop-settings.service';
import { promotionRepository } from '../repositories/promotion.repository';

interface CartActor {
  id: number;
  email: string;
  role: UserRole;
}

const toMoney = (value: number): number => Number(value.toFixed(2));

const toPositiveNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return undefined;
  return parsed;
};

const toNonNegativeMoney = (value: unknown, fallback = 0): number => {
  if (typeof value === 'undefined' || value === null || value === '') return fallback;
  const parsed = Number(value);
  if (Number.isNaN(parsed) || parsed < 0) throw new Error('INVALID_NUMBER');
  return toMoney(parsed);
};

const normalizeString = (value: unknown): string => {
  if (typeof value !== 'string') return '';
  return value.trim();
};

const normalizeOptionalString = (value: unknown): string | undefined => {
  const normalized = normalizeString(value);
  return normalized.length > 0 ? normalized : undefined;
};

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true' || normalized === '1') return true;
    if (normalized === 'false' || normalized === '0') return false;
  }
  return fallback;
};

const parseItemIds = (value: unknown): number[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const ids = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0);

  return ids.length > 0 ? Array.from(new Set(ids)) : undefined;
};

const parseGuestCartItems = (
  body: Record<string, unknown>,
): Array<{ variantId: number; quantity: number; selected: boolean }> => {
  const source = Array.isArray(body.items)
    ? body.items
    : Array.isArray(body.guestItems)
      ? body.guestItems
      : null;

  if (!source || source.length === 0) {
    throw new Error('INVALID_GUEST_CART');
  }

  return source.map((item) => {
    if (!item || typeof item !== 'object') throw new Error('INVALID_GUEST_CART');
    const row = item as Record<string, unknown>;
    const variantId = toPositiveNumber(row.variantId);
    const quantity = toPositiveNumber(row.quantity);

    if (!variantId || !quantity) throw new Error('INVALID_GUEST_CART');

    return {
      variantId,
      quantity,
      selected: toBoolean(row.selected, true),
    };
  });
};

const aggregateGuestCartItems = (
  items: Array<{ variantId: number; quantity: number; selected: boolean }>,
) => {
  const map = new Map<number, { variantId: number; quantity: number; selected: boolean }>();

  items.forEach((item) => {
    const current = map.get(item.variantId);
    if (current) {
      current.quantity += item.quantity;
      current.selected = current.selected || item.selected;
      return;
    }

    map.set(item.variantId, { ...item });
  });

  return Array.from(map.values());
};

const getPaymentMethod = (body: Record<string, unknown>): OrderPaymentMethod =>
  isOrderPaymentMethod(body.paymentMethod) ? body.paymentMethod : DEFAULT_ORDER_PAYMENT_METHOD;

const getUnitPrice = (row: any): number =>
  toMoney(Number(row.variant_price ?? row.sale_price ?? row.base_price ?? 0));

const getAvailability = (row: any, quantity: number): string => {
  if (!Number(row.product_is_active) || !Number(row.variant_is_active)) return 'INACTIVE';
  if (Number(row.stock_quantity || 0) <= 0) return 'OUT_OF_STOCK';
  if (Number(row.stock_quantity || 0) < quantity) return 'INSUFFICIENT_STOCK';
  return 'AVAILABLE';
};

const decorateItems = (
  rows: any[],
  selectedResolver?: (row: any) => boolean,
  quantityResolver?: (row: any) => number,
  idResolver?: (row: any) => number | null,
) =>
  rows.map((row) => {
    const quantity = quantityResolver ? quantityResolver(row) : Number(row.quantity || 0);
    const unitPrice = getUnitPrice(row);
    const lineTotal = toMoney(unitPrice * quantity);
    const selected = selectedResolver ? selectedResolver(row) : Boolean(row.is_selected);
    const availability = getAvailability(row, quantity);

    return {
      id: idResolver ? idResolver(row) : Number(row.cart_item_id),
      variantId: Number(row.variant_id),
      productId: Number(row.product_id),
      productName: String(row.product_name),
      productSlug: String(row.product_slug),
      productThumbnailUrl: row.product_thumbnail_url ? String(row.product_thumbnail_url) : null,
      brandName: row.brand_name ? String(row.brand_name) : null,
      categoryName: row.category_name ? String(row.category_name) : null,
      sku: String(row.sku),
      sizeLabel: row.size_label ? String(row.size_label) : null,
      colorName: row.color_name ? String(row.color_name) : null,
      quantity,
      unitPrice,
      lineTotal,
      stockQuantity: Number(row.stock_quantity || 0),
      selected,
      isAvailable: availability === 'AVAILABLE',
      availability,
      createdAt: row.cart_item_created_at ?? null,
      updatedAt: row.cart_item_updated_at ?? null,
    };
  });

const applyMarketingPricing = async (
  rows: any[],
  items: ReturnType<typeof decorateItems>,
) => {
  const productIds = Array.from(new Set(items.map((item) => item.productId)));
  const offers = await marketingRepository.findActiveOffersForProductIds(productIds);
  if (offers.size === 0) return items;

  const rowByProductId = new Map<number, any>();
  for (const row of rows) {
    const pid = Number(row.product_id);
    if (!rowByProductId.has(pid)) rowByProductId.set(pid, row);
  }

  return items.map((item) => {
    const pct = offers.get(item.productId);
    if (pct == null) return item;

    const row = rowByProductId.get(item.productId);
    const basePrice = Number(row?.base_price ?? 0);
    const salePrice = row?.sale_price != null ? Number(row.sale_price) : null;
    const catalogUnit = getUnitPrice(row ?? {});
    const unitPrice = computeMarketingSalePrice(basePrice, salePrice, pct, catalogUnit);

    return {
      ...item,
      unitPrice,
      lineTotal: toMoney(unitPrice * item.quantity),
    };
  });
};

const buildSummary = (items: Array<{ quantity: number; lineTotal: number; selected: boolean }>) => {
  const itemCount = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));

  const selectedItems = items.filter((item) => item.selected);
  const selectedItemCount = selectedItems.length;
  const selectedQuantity = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const selectedSubtotal = toMoney(selectedItems.reduce((sum, item) => sum + item.lineTotal, 0));

  return {
    itemCount,
    totalQuantity,
    subtotal,
    selectedItemCount,
    selectedQuantity,
    selectedSubtotal,
  };
};

const computeRowsBaseSubtotal = (rows: any[]): number =>
  toMoney(
    rows.reduce(
      (sum, row) => sum + toMoney(getUnitPrice(row) * Number(row.quantity || 0)),
      0,
    ),
  );

const buildValidationSummary = (
  items: Array<{
    selected: boolean;
    isValid: boolean;
  }>,
) => {
  const itemCount = items.length;
  const validItemCount = items.filter((item) => item.isValid).length;
  const invalidItemCount = itemCount - validItemCount;
  const selectedItems = items.filter((item) => item.selected);
  const selectedItemCount = selectedItems.length;
  const selectedValidItemCount = selectedItems.filter((item) => item.isValid).length;
  const selectedInvalidItemCount = selectedItemCount - selectedValidItemCount;

  return {
    itemCount,
    validItemCount,
    invalidItemCount,
    selectedItemCount,
    selectedValidItemCount,
    selectedInvalidItemCount,
    hasIssues: invalidItemCount > 0,
    checkoutReady: selectedItemCount > 0 && selectedInvalidItemCount === 0,
  };
};

const buildValidatedItems = (rows: any[]) =>
  decorateItems(rows).map((item) => {
    const issues = item.isAvailable ? [] : [item.availability];
    const suggestedQuantity =
      item.availability === 'INSUFFICIENT_STOCK'
        ? item.stockQuantity
        : item.availability === 'AVAILABLE'
          ? item.quantity
          : 0;

    return {
      ...item,
      isValid: issues.length === 0,
      issues,
      suggestedQuantity,
    };
  });

const buildCartResponse = async (cart: any) => {
  const rows = cart.items ?? [];
  let items = decorateItems(rows);
  items = await applyMarketingPricing(rows, items);

  const response = {
    id: Number(cart.id),
    userId: Number(cart.user_id),
    createdAt: cart.created_at,
    updatedAt: cart.updated_at,
    summary: buildSummary(items),
    items,
  };

  if (cart.user_email || cart.user_full_name) {
    return {
      ...response,
      user: {
        id: Number(cart.user_id),
        email: cart.user_email ? String(cart.user_email) : '',
        fullName: cart.user_full_name ? String(cart.user_full_name) : null,
      },
    };
  }

  return response;
};

const buildAdminCartListItem = (row: any) => ({
  id: Number(row.id),
  userId: Number(row.user_id),
  user: {
    id: Number(row.user_id),
    email: row.user_email ? String(row.user_email) : '',
    fullName: row.user_full_name ? String(row.user_full_name) : null,
  },
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  summary: {
    itemCount: Number(row.item_count || 0),
    totalQuantity: Number(row.total_quantity || 0),
    selectedItemCount: Number(row.selected_item_count || 0),
    selectedQuantity: Number(row.selected_quantity || 0),
  },
});

const buildPreview = async (
  source: 'CART',
  rows: any[],
  actor: CartActor,
  quantities?: Map<number, number>,
  selectedIds?: Set<number>,
  body?: Record<string, unknown>,
) => {
  let items = decorateItems(
    rows,
    (row) =>
      selectedIds ? selectedIds.has(Number(row.cart_item_id)) : true,
    (row) =>
      quantities?.get(Number(row.variant_id)) ?? Number(row.quantity || 0),
    (row) => (typeof row.cart_item_id === 'undefined' ? null : Number(row.cart_item_id)),
  );
  items = await applyMarketingPricing(rows, items);

  const subtotal = toMoney(items.reduce((sum, item) => sum + item.lineTotal, 0));
  let shippingFee =
    body?.shippingFee == null
      ? await shopSettingsService.getShippingFeeForSubtotal(subtotal)
      : toNonNegativeMoney(body?.shippingFee, 0);
  let discountAmount = 0;
  let voucherCode: string | null = null;
  let promotion: Awaited<ReturnType<typeof promotionService.resolveForCheckout>> | null = null;
  const rawVoucher = normalizeOptionalString(body?.voucherCode ?? body?.code);

  let promotionNotice: string | null = null;

  if (rawVoucher) {
    try {
      promotion = await promotionService.resolveForCheckout({
        code: rawVoucher,
        userId: actor.id,
        subtotal,
        shippingFee,
      });
      discountAmount = promotion.discountAmount;
      shippingFee = promotion.shippingFee;
      voucherCode = promotion.code;
    } catch (error) {
      const errorCode = error instanceof Error ? error.message.split(':')[0] : '';
      const row = await promotionRepository.findByCode(rawVoucher);
      promotionNotice =
        buildCheckoutPromotionNotice(errorCode, subtotal, row) ??
        'Không thể áp dụng mã khuyến mãi này.';
      voucherCode = null;
      discountAmount = 0;
    }
  }

  const totalAmount = toMoney(subtotal + shippingFee - discountAmount);
  if (totalAmount < 0) throw new Error('INVALID_ORDER_TOTAL');

  return {
    source,
    paymentMethod: getPaymentMethod(body ?? {}),
    currencyCode: (normalizeString(body?.currencyCode) || 'VND').slice(0, 3).toUpperCase(),
    shippingFee,
    discountAmount,
    voucherCode,
    promotionNotice,
    promotion,
    subtotal,
    totalAmount,
    itemCount: items.length,
    totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
    hasUnavailableItems: items.some((item) => !item.isAvailable),
    items,
  };
};

const rollbackUnpaidOrder = async (order: any, actor: CartActor, reason: string) => {
  if (!order?.id) return;
  if (String(order.status) === 'CANCELLED' || String(order.status) === 'REFUNDED') return;

  await orderRepository.updateState({
    orderId: Number(order.id),
    status: 'CANCELLED',
    fulfillmentStatus: 'CANCELLED',
    cancelReason: reason,
    cancelledAt: new Date(),
    historyAction: 'ORDER_CANCELLED',
    historyNote: reason,
    restockItems: true,
    restockNote: `${reason}. Stock restored automatically.`,
    actorUserId: actor.id,
    actorRole: actor.role,
    actorLabel: `${actor.email} [payment-init-rollback]`,
  });
};

const getReorderItemLabel = (item: any, snapshot?: any): string => {
  const productName =
    snapshot?.product_name ?? item.product_name ?? item.productName ?? item.sku ?? item.variant_id;
  const sku = snapshot?.sku ?? item.sku;
  return sku ? `${productName} (${sku})` : String(productName);
};

export const cartService = {
  async listForAdmin(query: Record<string, unknown>) {
    const page = toPositiveNumber(query.page) ?? 1;
    const limit = Math.min(toPositiveNumber(query.limit) ?? 10, 100);

    const filters: AdminCartListFilters = {
      search: normalizeOptionalString(query.search),
      page,
      limit,
    };

    const result = await cartRepository.listForAdmin(filters);
    return {
      ...result,
      items: result.items.map(buildAdminCartListItem),
    };
  },

  async detailForAdmin(userId: number) {
    if (!userId || userId <= 0) throw new Error('INVALID_USER_ID');
    const cart = await cartRepository.getCartForAdmin(userId);
    if (!cart) throw new Error('CART_NOT_FOUND');
    return await buildCartResponse(cart);
  },

  async detail(actor: CartActor) {
    const cart = await cartRepository.getCart(actor.id);
    return await buildCartResponse(cart);
  },

  async reorderFromOrder(identifier: string, actor: CartActor) {
    const order = await orderRepository.getDetailByIdOrCode(identifier, { userId: actor.id });
    if (!order) throw new Error('ORDER_NOT_FOUND');

    const orderItems = (Array.isArray(order.items) ? order.items : []) as any[];
    if (orderItems.length === 0) throw new Error('INVALID_ORDER_ITEM');

    const existingItems = await cartRepository.getItems(actor.id);
    const existingQuantityByVariant = new Map<number, number>();

    existingItems.forEach((item) => {
      existingQuantityByVariant.set(
        Number(item.variant_id),
        Number(item.quantity || 0),
      );
    });

    const variantIds = Array.from(
      new Set(
        orderItems
          .map((item: any) => Number(item.variant_id))
          .filter((variantId: number) => Number.isInteger(variantId) && variantId > 0),
      ),
    );

    const snapshots = await cartRepository.getVariantSnapshots(variantIds);
    const snapshotByVariant = new Map<number, any>(
      snapshots.map((snapshot) => [Number(snapshot.variant_id), snapshot]),
    );

    for (const item of orderItems) {
      const variantId = Number(item.variant_id);
      const quantity = Number(item.quantity || 0);
      const snapshot = snapshotByVariant.get(variantId);

      if (!snapshot) {
        throw new Error(`REORDER_ITEM_UNAVAILABLE:${getReorderItemLabel(item)}`);
      }

      if (!Number(snapshot.product_is_active) || !Number(snapshot.variant_is_active)) {
        throw new Error(`REORDER_ITEM_UNAVAILABLE:${getReorderItemLabel(item, snapshot)}`);
      }

      const nextQuantity = (existingQuantityByVariant.get(variantId) ?? 0) + quantity;
      if (Number(snapshot.stock_quantity || 0) < nextQuantity) {
        throw new Error(`REORDER_ITEM_UNAVAILABLE:${getReorderItemLabel(item, snapshot)}`);
      }
    }

    let cart: any = null;

    for (const item of orderItems) {
      const variantId = Number(item.variant_id);
      const quantity = Number(item.quantity || 0);

      cart = await cartRepository.addItem(actor.id, variantId, quantity, true);
    }

    const finalCart = cart ?? (await cartRepository.getCart(actor.id));

    return {
      source: 'REORDER',
      originalOrder: {
        id: Number(order.id),
        orderCode: String(order.order_code),
      },
      cart: await buildCartResponse(finalCart),
    };
  },

  async addItem(body: Record<string, unknown>, actor: CartActor) {
    const variantId = toPositiveNumber(body.variantId);
    const quantity = toPositiveNumber(body.quantity);
    const selected = toBoolean(body.selected, true);

    if (!variantId) throw new Error('INVALID_VARIANT_ID');
    if (!quantity) throw new Error('INVALID_QUANTITY');

    const [snapshot] = await cartRepository.getVariantSnapshots([variantId]);
    if (!snapshot) throw new Error('VARIANT_NOT_FOUND');

    const existingItems = await cartRepository.getItems(actor.id);
    const existingItem = existingItems.find((item) => Number(item.variant_id) === variantId);
    const nextQuantity = Number(existingItem?.quantity || 0) + quantity;
    if (Number(snapshot.stock_quantity || 0) < nextQuantity) {
      throw new Error('INSUFFICIENT_STOCK');
    }

    const cart = await cartRepository.addItem(actor.id, variantId, quantity, selected);
    return await buildCartResponse(cart);
  },

  async updateItem(itemId: number, body: Record<string, unknown>, actor: CartActor) {
    const item = await cartRepository.getItemById(actor.id, itemId);
    if (!item) throw new Error('CART_ITEM_NOT_FOUND');

    const nextQuantity =
      typeof body.quantity === 'undefined' ? undefined : toPositiveNumber(body.quantity);
    const nextSelected =
      typeof body.selected === 'undefined' ? undefined : toBoolean(body.selected, true);

    if (typeof body.quantity !== 'undefined' && !nextQuantity) {
      throw new Error('INVALID_QUANTITY');
    }

    if (typeof nextQuantity !== 'undefined') {
      const [snapshot] = await cartRepository.getVariantSnapshots([Number(item.variant_id)]);
      if (!snapshot) throw new Error('VARIANT_NOT_FOUND');
      if (Number(snapshot.stock_quantity || 0) < nextQuantity) {
        throw new Error('INSUFFICIENT_STOCK');
      }
    }

    const cart = await cartRepository.updateItem(actor.id, itemId, {
      quantity: nextQuantity,
      selected: nextSelected,
    });

    return await buildCartResponse(cart);
  },

  async removeItem(itemId: number, actor: CartActor) {
    const cart = await cartRepository.removeItem(actor.id, itemId);
    return await buildCartResponse(cart);
  },

  async selectAll(body: Record<string, unknown>, actor: CartActor) {
    const selected = toBoolean(body.selected, true);
    const cart = await cartRepository.selectAll(actor.id, selected);
    return await buildCartResponse(cart);
  },

  async selectItems(body: Record<string, unknown>, actor: CartActor) {
    const itemIds = parseItemIds(body.itemIds);
    const selected = toBoolean(body.selected, true);

    if (!itemIds || itemIds.length === 0) throw new Error('MISSING_ITEM_IDS');

    const existingItems = await cartRepository.getItems(actor.id, { itemIds });
    if (existingItems.length !== itemIds.length) throw new Error('CART_ITEM_NOT_FOUND');

    const cart = await cartRepository.selectItems(actor.id, itemIds, selected);
    return await buildCartResponse(cart);
  },

  async clear(body: Record<string, unknown>, actor: CartActor) {
    const itemIds = parseItemIds(body.itemIds);
    const selectedOnly = toBoolean(body.selectedOnly, false);
    const cart = await cartRepository.clearCart(actor.id, { itemIds, selectedOnly });
    return await buildCartResponse(cart);
  },

  async validate(body: Record<string, unknown>, actor: CartActor) {
    const itemIds = parseItemIds(body.itemIds);
    const selectedOnly = itemIds ? false : toBoolean(body.selectedOnly, false);
    const rows = await cartRepository.getItems(actor.id, {
      itemIds,
      selectedOnly,
    });

    if (rows.length === 0) throw new Error('CART_EMPTY');
    if (itemIds && rows.length !== itemIds.length) throw new Error('CART_ITEM_NOT_FOUND');

    const items = buildValidatedItems(rows);

    return {
      source: 'CART',
      selection: {
        itemIds: itemIds ?? null,
        selectedOnly,
      },
      summary: buildValidationSummary(items),
      items,
      cart: await buildCartResponse(await cartRepository.getCart(actor.id)),
    };
  },

  async merge(body: Record<string, unknown>, actor: CartActor) {
    const guestItems = aggregateGuestCartItems(parseGuestCartItems(body));
    const variantIds = guestItems.map((item) => item.variantId);
    const [snapshots, existingItems] = await Promise.all([
      cartRepository.getVariantSnapshots(variantIds),
      cartRepository.getItems(actor.id),
    ]);

    const snapshotByVariant = new Map<number, any>(
      snapshots.map((snapshot) => [Number(snapshot.variant_id), snapshot]),
    );
    const existingByVariant = new Map<number, any>(
      existingItems.map((item) => [Number(item.variant_id), item]),
    );

    const upsertItems: Array<{ variantId: number; quantity: number; selected: boolean }> = [];
    const mergeResults = guestItems.map((item) => {
      const snapshot = snapshotByVariant.get(item.variantId);
      const existingItem = existingByVariant.get(item.variantId);
      const existingQuantity = Number(existingItem?.quantity || 0);

      if (!snapshot) {
        return {
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          mergedQuantity: 0,
          finalQuantity: existingQuantity,
          selected: item.selected,
          status: 'SKIPPED',
          reason: 'VARIANT_NOT_FOUND',
        };
      }

      const availability = getAvailability(snapshot, 1);
      if (availability !== 'AVAILABLE') {
        return {
          variantId: item.variantId,
          requestedQuantity: item.quantity,
          mergedQuantity: 0,
          finalQuantity: existingQuantity,
          selected: item.selected,
          status: 'SKIPPED',
          reason: availability,
        };
      }

      const stockQuantity = Number(snapshot.stock_quantity || 0);
      // Gop guest: dat muc tieu = max(gio server, gio guest), khong cong them neu da du so luong guest.
      const requestedFinalQuantity = Math.max(existingQuantity, item.quantity);
      const finalQuantity = Math.min(stockQuantity, requestedFinalQuantity);
      const mergedQuantity = Math.max(0, finalQuantity - existingQuantity);

      if (mergedQuantity > 0) {
        upsertItems.push({
          variantId: item.variantId,
          quantity: mergedQuantity,
          selected: item.selected,
        });
      }

      return {
        variantId: item.variantId,
        requestedQuantity: item.quantity,
        mergedQuantity,
        finalQuantity,
        selected: item.selected,
        status:
          mergedQuantity === 0 ? 'SKIPPED' : finalQuantity < requestedFinalQuantity ? 'PARTIAL' : 'MERGED',
        reason:
          mergedQuantity === 0
            ? 'INSUFFICIENT_STOCK'
            : finalQuantity < requestedFinalQuantity
              ? 'INSUFFICIENT_STOCK'
              : null,
      };
    });

    let cart = await cartRepository.upsertItems(actor.id, upsertItems);

    const itemIdsToSelect = guestItems
      .filter((item) => item.selected)
      .map((item) => {
        const cartItem = (cart.items ?? []).find(
          (row: any) => Number(row.variant_id) === item.variantId,
        );
        return cartItem ? Number(cartItem.cart_item_id) : null;
      })
      .filter((itemId): itemId is number => Boolean(itemId));

    if (itemIdsToSelect.length > 0) {
      cart = await cartRepository.selectItems(actor.id, itemIdsToSelect, true);
    }

    const responseCart = await buildCartResponse(cart);
    const finalQuantityByVariant = new Map<number, number>(
      responseCart.items.map((item) => [Number(item.variantId), Number(item.quantity)]),
    );

    const items = mergeResults.map((item) => ({
      ...item,
      finalQuantity: finalQuantityByVariant.get(item.variantId) ?? item.finalQuantity,
    }));

    return {
      source: 'GUEST_CART_MERGE',
      summary: {
        requestedItemCount: guestItems.length,
        mergedItemCount: items.filter((item) => item.status === 'MERGED').length,
        partialItemCount: items.filter((item) => item.status === 'PARTIAL').length,
        skippedItemCount: items.filter((item) => item.status === 'SKIPPED').length,
        hasIssues: items.some((item) => item.status !== 'MERGED'),
      },
      items,
      cart: responseCart,
    };
  },

  async previewCheckout(body: Record<string, unknown>, actor: CartActor) {
    const itemIds = parseItemIds(body.itemIds);
    const rows = await cartRepository.getItems(actor.id, {
      selectedOnly: !itemIds,
      itemIds,
    });

    if (rows.length === 0) throw new Error('CART_EMPTY');

    return buildPreview(
      'CART',
      rows,
      actor,
      undefined,
      new Set(rows.map((row) => Number(row.cart_item_id))),
      body,
    );
  },

  async checkoutFromCart(body: Record<string, unknown>, actor: CartActor) {
    const itemIds = parseItemIds(body.itemIds);
    const rows = await cartRepository.getItems(actor.id, {
      selectedOnly: !itemIds,
      itemIds,
    });

    if (rows.length === 0) throw new Error('CART_EMPTY');

    const preview = await buildPreview(
      'CART',
      rows,
      actor,
      undefined,
      new Set(rows.map((row) => Number(row.cart_item_id))),
      body,
    );

    // Order line items are priced with marketing % at creation; voucher-only discount here.
    const order = await orderService.create(
      {
        ...body,
        source: 'CART',
        voucherCode: preview.voucherCode ?? body.voucherCode,
        subtotal: preview.subtotal,
        discountAmount: Number(preview.discountAmount || 0),
        shippingFee: preview.shippingFee,
        items: rows.map((row) => ({
          variantId: Number(row.variant_id),
          quantity: Number(row.quantity),
        })),
      },
      actor,
    );

    if (String(order.payment_method) === 'COD') {
      const cart = await buildCartResponse(
        await cartRepository.clearCart(actor.id, {
          itemIds: rows.map((row) => Number(row.cart_item_id)),
        }),
      );

      return {
        source: 'CART',
        preview,
        order,
        payment: null,
        cart,
      };
    }

    try {
      const payment = await paymentService.createCheckout(String(order.order_code), body, actor);
      const cart = await buildCartResponse(
        await cartRepository.clearCart(actor.id, {
          itemIds: rows.map((row) => Number(row.cart_item_id)),
        }),
      );

      return {
        source: 'CART',
        preview,
        order,
        payment,
        cart,
      };
    } catch (error) {
      try {
        await rollbackUnpaidOrder(order, actor, 'Checkout initialization failed');
      } catch {
        throw new Error('PAYMENT_INIT_ROLLBACK_FAILED');
      }
      throw error;
    }
  },
};
