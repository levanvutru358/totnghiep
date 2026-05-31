import type { PoolConnection } from 'mysql2/promise';
import {
  type OrderFulfillmentStatus,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
} from '../constants/orders';
import type { UserRole } from '../constants/roles';
import { pool } from '../configs/database.config';
import { marketingRepository } from './marketing.repository';
import { resolveMarketingUnitPriceForProduct } from '../services/marketing.service';

export interface OrderListFilters {
  search?: string;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  fulfillmentStatus?: OrderFulfillmentStatus;
  paymentMethod?: OrderPaymentMethod;
  userId?: number;
  createdFrom?: string;
  createdTo?: string;
  page: number;
  limit: number;
}

export interface OrderScope {
  userId?: number;
}

export interface ReturnRequestListFilters {
  search?: string;
  page: number;
  limit: number;
}

export interface CreateOrderItemInput {
  variantId: number;
  quantity: number;
}

export interface CreateOrderInput {
  orderCode: string;
  userId: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  fulfillmentStatus: OrderFulfillmentStatus;
  paymentMethod: OrderPaymentMethod;
  shippingMethod?: string | null;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  voucherCode?: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientEmail?: string | null;
  shippingAddressLine1: string;
  shippingAddressLine2?: string | null;
  shippingWard?: string | null;
  shippingDistrict?: string | null;
  shippingProvince?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry?: string | null;
  note?: string | null;
  customerNote?: string | null;
  adminNote?: string | null;
  discountAmount: number;
  shippingFee: number;
  currencyCode: string;
  items: CreateOrderItemInput[];
  historyAction: string;
  historyNote?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
  actorLabel?: string | null;
}

export interface UpdateOrderStateInput {
  orderId: number;
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  fulfillmentStatus?: OrderFulfillmentStatus;
  shippingCarrier?: string | null;
  trackingNumber?: string | null;
  adminNote?: string | null;
  cancelReason?: string | null;
  confirmedAt?: Date | null;
  packedAt?: Date | null;
  shippedAt?: Date | null;
  deliveredAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  returnRequestedAt?: Date | null;
  returnedAt?: Date | null;
  refundedAt?: Date | null;
  historyAction: string;
  historyNote?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
  actorLabel?: string | null;
  restockItems?: boolean;
  restockNote?: string | null;
}

const orderBaseSelect = `
  SELECT
    o.id,
    o.order_code,
    o.user_id,
    o.status,
    o.payment_status,
    o.fulfillment_status,
    o.payment_method,
    o.shipping_method,
    o.shipping_carrier,
    o.tracking_number,
    o.voucher_code,
    o.recipient_name,
    o.recipient_phone,
    o.recipient_email,
    o.shipping_address_line1,
    o.shipping_address_line2,
    o.shipping_ward,
    o.shipping_district,
    o.shipping_province,
    o.shipping_postal_code,
    o.shipping_country,
    o.note,
    o.customer_note,
    o.admin_note,
    o.cancel_reason,
    o.subtotal,
    o.discount_amount,
    o.shipping_fee,
    o.total_amount,
    o.currency_code,
    o.item_count,
    o.total_quantity,
    o.placed_at,
    o.confirmed_at,
    o.packed_at,
    o.shipped_at,
    o.delivered_at,
    o.completed_at,
    o.cancelled_at,
    o.return_requested_at,
    o.returned_at,
    o.refunded_at,
    o.created_at,
    o.updated_at,
    u.email AS user_email,
    u.full_name AS user_full_name
  FROM orders o
  INNER JOIN users u ON u.id = o.user_id
`;

const returnRequestBaseSelect = `
  SELECT
    osh.id AS return_id,
    osh.order_id,
    osh.action,
    osh.note AS return_reason,
    osh.created_at AS requested_at,
    o.order_code,
    o.user_id,
    o.status AS order_status,
    o.payment_status,
    o.fulfillment_status,
    o.payment_method,
    o.total_amount,
    o.currency_code,
    o.recipient_name,
    o.recipient_phone,
    o.recipient_email,
    u.email AS user_email,
    u.full_name AS user_full_name
  FROM order_status_histories osh
  INNER JOIN orders o ON o.id = osh.order_id
  INNER JOIN users u ON u.id = o.user_id
`;

const toFixedMoney = (value: number): number => Number(value.toFixed(2));

const buildWhereClause = (
  filters: OrderListFilters,
  scope?: OrderScope,
): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (scope?.userId) {
    clauses.push('o.user_id = ?');
    params.push(scope.userId);
  }

  if (filters.userId) {
    clauses.push('o.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.search) {
    clauses.push('(o.order_code LIKE ? OR o.recipient_name LIKE ? OR o.recipient_phone LIKE ? OR COALESCE(o.recipient_email, \'\') LIKE ?)');
    const keyword = `%${filters.search}%`;
    params.push(keyword, keyword, keyword, keyword);
  }

  if (filters.status) {
    clauses.push('o.status = ?');
    params.push(filters.status);
  }

  if (filters.paymentStatus) {
    clauses.push('o.payment_status = ?');
    params.push(filters.paymentStatus);
  }

  if (filters.fulfillmentStatus) {
    clauses.push('o.fulfillment_status = ?');
    params.push(filters.fulfillmentStatus);
  }

  if (filters.paymentMethod) {
    clauses.push('o.payment_method = ?');
    params.push(filters.paymentMethod);
  }

  if (filters.createdFrom) {
    clauses.push('o.created_at >= ?');
    params.push(filters.createdFrom);
  }

  if (filters.createdTo) {
    clauses.push('o.created_at <= ?');
    params.push(filters.createdTo);
  }

  return { whereSql: clauses.join(' AND '), params };
};

const getIdentifierClause = (identifier: string): { sql: string; params: unknown[] } => {
  const isId = /^\d+$/.test(identifier);
  return {
    sql: isId ? 'o.id = ?' : 'o.order_code = ?',
    params: [isId ? Number(identifier) : identifier],
  };
};

const getIdentifierClauseById = (id: number): { sql: string; params: unknown[] } => ({
  sql: 'o.id = ?',
  params: [id],
});

const loadOrderRow = async (
  identifier: string | number,
  scope?: OrderScope,
): Promise<any | null> => {
  const clause =
    typeof identifier === 'number'
      ? getIdentifierClauseById(identifier)
      : getIdentifierClause(identifier);
  const scopeSql = scope?.userId ? ' AND o.user_id = ?' : '';
  const scopeParams = scope?.userId ? [scope.userId] : [];

  const [rows] = await pool.query(
    `${orderBaseSelect}
     WHERE ${clause.sql}${scopeSql}
     LIMIT 1`,
    [...clause.params, ...scopeParams],
  );

  return (rows as any[])[0] || null;
};

const insertHistory = async (
  connection: PoolConnection,
  orderId: number,
  action: string,
  status: OrderStatus,
  paymentStatus: OrderPaymentStatus,
  fulfillmentStatus: OrderFulfillmentStatus,
  note?: string | null,
  actorUserId?: number | null,
  actorRole?: UserRole | null,
) => {
  await connection.query(
    `INSERT INTO order_status_histories (
      order_id, action, status, payment_status, fulfillment_status, note, actor_user_id, actor_role
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      orderId,
      action,
      status,
      paymentStatus,
      fulfillmentStatus,
      note ?? null,
      actorUserId ?? null,
      actorRole ?? null,
    ],
  );
};

export const orderRepository = {
  async estimateItemsSubtotal(items: CreateOrderItemInput[]): Promise<number> {
    if (items.length === 0) return 0;

    const variantIds = items.map((item) => item.variantId);
    const [variantRows] = await pool.query(
      `SELECT
         pv.id,
         COALESCE(pv.price, p.sale_price, p.base_price, 0) AS unit_price
       FROM product_variants pv
       INNER JOIN products p ON p.id = pv.product_id
       WHERE pv.is_active = 1 AND p.is_active = 1 AND pv.id IN (?)`,
      [variantIds],
    );

    const variantsMap = new Map<number, Record<string, unknown>>(
      (variantRows as Record<string, unknown>[]).map((row) => [Number(row.id), row]),
    );

    let subtotal = 0;
    for (const item of items) {
      const variant = variantsMap.get(item.variantId);
      if (!variant) throw new Error('VARIANT_NOT_FOUND');
      const unitPrice = toFixedMoney(Number(variant.unit_price ?? 0));
      subtotal += toFixedMoney(unitPrice * item.quantity);
    }

    return toFixedMoney(subtotal);
  },

  async list(filters: OrderListFilters, scope?: OrderScope) {
    const { whereSql, params } = buildWhereClause(filters, scope);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `${orderBaseSelect}
       WHERE ${whereSql}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM orders o
       WHERE ${whereSql}`,
      params,
    );

    const total = Number((countRows as any[])[0]?.total || 0);

    return {
      items: rows as any[],
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  },

  async listAll(filters: Omit<OrderListFilters, 'page' | 'limit'>, scope?: OrderScope) {
    const { whereSql, params } = buildWhereClause(
      {
        ...filters,
        page: 1,
        limit: 1,
      },
      scope,
    );

    const [rows] = await pool.query(
      `${orderBaseSelect}
       WHERE ${whereSql}
       ORDER BY o.created_at DESC`,
      params,
    );

    return rows as any[];
  },

  async getByIdOrCode(identifier: string, scope?: OrderScope) {
    return loadOrderRow(identifier, scope);
  },

  async getItems(orderId: number) {
    const [rows] = await pool.query(
      `SELECT
         oi.id,
         oi.order_id,
         oi.product_id,
         oi.variant_id,
         oi.product_name,
         oi.product_slug,
         oi.product_thumbnail_url,
         oi.brand_name,
         oi.category_name,
         oi.sku,
         oi.size_label,
         oi.color_name,
         oi.unit_price,
         oi.quantity,
         oi.line_total,
         oi.created_at,
         oi.updated_at
       FROM order_items oi
       WHERE oi.order_id = ?
       ORDER BY oi.id ASC`,
      [orderId],
    );

    return rows as any[];
  },

  async getHistory(orderId: number) {
    const [rows] = await pool.query(
      `SELECT
         osh.id,
         osh.order_id,
         osh.action,
         osh.status,
         osh.payment_status,
         osh.fulfillment_status,
         osh.note,
         osh.actor_user_id,
         osh.actor_role,
         osh.created_at,
         u.email AS actor_email,
         u.full_name AS actor_full_name
       FROM order_status_histories osh
       LEFT JOIN users u ON u.id = osh.actor_user_id
       WHERE osh.order_id = ?
       ORDER BY osh.created_at ASC, osh.id ASC`,
      [orderId],
    );

    return rows as any[];
  },

  async listReturnRequests(filters: ReturnRequestListFilters) {
    const clauses = [`osh.action = 'RETURN_REQUESTED'`];
    const params: unknown[] = [];

    if (filters.search) {
      clauses.push(
        `(o.order_code LIKE ? OR u.email LIKE ? OR COALESCE(u.full_name, '') LIKE ? OR o.recipient_name LIKE ? OR o.recipient_phone LIKE ?)`,
      );
      const keyword = `%${filters.search}%`;
      params.push(keyword, keyword, keyword, keyword, keyword);
    }

    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `${returnRequestBaseSelect}
       WHERE ${clauses.join(' AND ')}
       ORDER BY osh.created_at DESC, osh.id DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM order_status_histories osh
       INNER JOIN orders o ON o.id = osh.order_id
       INNER JOIN users u ON u.id = o.user_id
       WHERE ${clauses.join(' AND ')}`,
      params,
    );

    const total = Number((countRows as any[])[0]?.total || 0);

    return {
      items: rows as any[],
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit),
    };
  },

  async getReturnRequestById(returnId: number) {
    const [rows] = await pool.query(
      `${returnRequestBaseSelect}
       WHERE osh.action = 'RETURN_REQUESTED'
         AND osh.id = ?
       LIMIT 1`,
      [returnId],
    );

    return (rows as any[])[0] ?? null;
  },

  async getDetailByIdOrCode(identifier: string, scope?: OrderScope) {
    const order = await this.getByIdOrCode(identifier, scope);
    if (!order) return null;

    const [items, history] = await Promise.all([
      this.getItems(Number(order.id)),
      this.getHistory(Number(order.id)),
    ]);

    return {
      ...order,
      items,
      history,
    };
  },

  async getDetailById(orderId: number, scope?: OrderScope) {
    const order = await loadOrderRow(orderId, scope);
    if (!order) return null;

    const [items, history] = await Promise.all([
      this.getItems(Number(order.id)),
      this.getHistory(Number(order.id)),
    ]);

    return {
      ...order,
      items,
      history,
    };
  },

  async create(input: CreateOrderInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const variantIds = input.items.map((item) => item.variantId);

      const [variantRows] = await connection.query(
        `SELECT
           pv.id,
           pv.product_id,
           pv.sku,
           pv.price AS variant_price,
           pv.stock_quantity,
           p.name AS product_name,
           p.slug AS product_slug,
           p.thumbnail_url AS product_thumbnail_url,
           p.sale_price,
           p.base_price,
           b.name AS brand_name,
           c.name AS category_name,
           s.label AS size_label,
           clr.name AS color_name
         FROM product_variants pv
         INNER JOIN products p ON p.id = pv.product_id
         INNER JOIN brands b ON b.id = p.brand_id
         INNER JOIN categories c ON c.id = p.category_id
         INNER JOIN sizes s ON s.id = pv.size_id
         INNER JOIN colors clr ON clr.id = pv.color_id
         WHERE pv.is_active = 1
           AND p.is_active = 1
           AND pv.id IN (?)
         FOR UPDATE`,
        [variantIds],
      );

      const variants = variantRows as any[];
      const variantsMap = new Map<number, any>(
        variants.map((item) => [Number(item.id), item]),
      );

      if (variantsMap.size !== variantIds.length) {
        throw new Error('VARIANT_NOT_FOUND');
      }

      const productIds = Array.from(
        new Set(variants.map((row) => Number(row.product_id))),
      );
      const marketingOffers = await marketingRepository.findActiveOffersForProductIds(
        productIds,
      );

      let subtotal = 0;
      let totalQuantity = 0;
      const preparedItems = input.items.map((item) => {
        const variant = variantsMap.get(item.variantId);
        if (!variant) throw new Error('VARIANT_NOT_FOUND');

        const currentStock = Number(variant.stock_quantity || 0);
        if (currentStock < item.quantity) throw new Error('INSUFFICIENT_STOCK');

        const unitPrice = toFixedMoney(
          resolveMarketingUnitPriceForProduct(
            Number(variant.product_id),
            variant,
            marketingOffers,
          ),
        );
        const lineTotal = toFixedMoney(unitPrice * item.quantity);

        subtotal += lineTotal;
        totalQuantity += item.quantity;

        return {
          ...item,
          productId: Number(variant.product_id),
          productName: String(variant.product_name),
          productSlug: String(variant.product_slug),
          productThumbnailUrl: variant.product_thumbnail_url
            ? String(variant.product_thumbnail_url)
            : null,
          brandName: variant.brand_name ? String(variant.brand_name) : null,
          categoryName: variant.category_name ? String(variant.category_name) : null,
          sku: String(variant.sku),
          sizeLabel: variant.size_label ? String(variant.size_label) : null,
          colorName: variant.color_name ? String(variant.color_name) : null,
          unitPrice,
          lineTotal,
        };
      });

      subtotal = toFixedMoney(subtotal);
      const totalAmount = toFixedMoney(subtotal + input.shippingFee - input.discountAmount);
      if (totalAmount < 0) throw new Error('INVALID_ORDER_TOTAL');

      const [orderResult] = await connection.query(
        `INSERT INTO orders (
          order_code,
          user_id,
          status,
          payment_status,
          fulfillment_status,
          payment_method,
          shipping_method,
          shipping_carrier,
          tracking_number,
          voucher_code,
          recipient_name,
          recipient_phone,
          recipient_email,
          shipping_address_line1,
          shipping_address_line2,
          shipping_ward,
          shipping_district,
          shipping_province,
          shipping_postal_code,
          shipping_country,
          note,
          customer_note,
          admin_note,
          subtotal,
          discount_amount,
          shipping_fee,
          total_amount,
          currency_code,
          item_count,
          total_quantity,
          placed_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
        [
          input.orderCode,
          input.userId,
          input.status,
          input.paymentStatus,
          input.fulfillmentStatus,
          input.paymentMethod,
          input.shippingMethod ?? null,
          input.shippingCarrier ?? null,
          input.trackingNumber ?? null,
          input.voucherCode ?? null,
          input.recipientName,
          input.recipientPhone,
          input.recipientEmail ?? null,
          input.shippingAddressLine1,
          input.shippingAddressLine2 ?? null,
          input.shippingWard ?? null,
          input.shippingDistrict ?? null,
          input.shippingProvince ?? null,
          input.shippingPostalCode ?? null,
          input.shippingCountry ?? 'VN',
          input.note ?? null,
          input.customerNote ?? null,
          input.adminNote ?? null,
          subtotal,
          input.discountAmount,
          input.shippingFee,
          totalAmount,
          input.currencyCode,
          preparedItems.length,
          totalQuantity,
        ],
      );

      const orderId = Number((orderResult as any).insertId);

      for (const item of preparedItems) {
        await connection.query(
          `INSERT INTO order_items (
            order_id,
            product_id,
            variant_id,
            product_name,
            product_slug,
            product_thumbnail_url,
            brand_name,
            category_name,
            sku,
            size_label,
            color_name,
            unit_price,
            quantity,
            line_total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            orderId,
            item.productId,
            item.variantId,
            item.productName,
            item.productSlug,
            item.productThumbnailUrl,
            item.brandName,
            item.categoryName,
            item.sku,
            item.sizeLabel,
            item.colorName,
            item.unitPrice,
            item.quantity,
            item.lineTotal,
          ],
        );

        await connection.query(
          `UPDATE product_variants
           SET stock_quantity = stock_quantity - ?, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [item.quantity, item.variantId],
        );

        await connection.query(
          `INSERT INTO inventory_transactions (
            variant_id, transaction_type, quantity, note, reference_code, created_by
          ) VALUES (?, 'OUT', ?, ?, ?, ?)`,
          [
            item.variantId,
            item.quantity,
            input.historyNote ?? 'Order placed',
            input.orderCode,
            input.actorLabel ?? null,
          ],
        );
      }

      await insertHistory(
        connection,
        orderId,
        input.historyAction,
        input.status,
        input.paymentStatus,
        input.fulfillmentStatus,
        input.historyNote ?? null,
        input.actorUserId ?? null,
        input.actorRole ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailById(orderId);
      if (!detail) throw new Error('ORDER_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async updateState(input: UpdateOrderStateInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [orderRows] = await connection.query(
        `SELECT id, order_code, status, payment_status, fulfillment_status
         FROM orders
         WHERE id = ?
         LIMIT 1
         FOR UPDATE`,
        [input.orderId],
      );

      const order = (orderRows as any[])[0];
      if (!order) throw new Error('ORDER_NOT_FOUND');

      if (input.restockItems) {
        const [itemRows] = await connection.query(
          `SELECT variant_id, quantity
           FROM order_items
           WHERE order_id = ?`,
          [input.orderId],
        );

        for (const item of itemRows as any[]) {
          await connection.query(
            `UPDATE product_variants
             SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [Number(item.quantity || 0), Number(item.variant_id)],
          );

          await connection.query(
            `INSERT INTO inventory_transactions (
              variant_id, transaction_type, quantity, note, reference_code, created_by
            ) VALUES (?, 'IN', ?, ?, ?, ?)`,
            [
              Number(item.variant_id),
              Number(item.quantity || 0),
              input.restockNote ?? 'Order stock restored',
              String(order.order_code),
              input.actorLabel ?? null,
            ],
          );
        }
      }

      const updates: string[] = [];
      const params: unknown[] = [];

      const map: Array<[keyof UpdateOrderStateInput, string]> = [
        ['status', 'status'],
        ['paymentStatus', 'payment_status'],
        ['fulfillmentStatus', 'fulfillment_status'],
        ['shippingCarrier', 'shipping_carrier'],
        ['trackingNumber', 'tracking_number'],
        ['adminNote', 'admin_note'],
        ['cancelReason', 'cancel_reason'],
        ['confirmedAt', 'confirmed_at'],
        ['packedAt', 'packed_at'],
        ['shippedAt', 'shipped_at'],
        ['deliveredAt', 'delivered_at'],
        ['completedAt', 'completed_at'],
        ['cancelledAt', 'cancelled_at'],
        ['returnRequestedAt', 'return_requested_at'],
        ['returnedAt', 'returned_at'],
        ['refundedAt', 'refunded_at'],
      ];

      map.forEach(([key, column]) => {
        const value = input[key];
        if (typeof value !== 'undefined') {
          updates.push(`${column} = ?`);
          params.push(value);
        }
      });

      const nextStatus = (input.status ?? order.status) as OrderStatus;
      const nextPaymentStatus = (input.paymentStatus ??
        order.payment_status) as OrderPaymentStatus;
      const nextFulfillmentStatus = (input.fulfillmentStatus ??
        order.fulfillment_status) as OrderFulfillmentStatus;

      if (updates.length > 0) {
        await connection.query(
          `UPDATE orders
           SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [...params, input.orderId],
        );
      }

      await insertHistory(
        connection,
        input.orderId,
        input.historyAction,
        nextStatus,
        nextPaymentStatus,
        nextFulfillmentStatus,
        input.historyNote ?? null,
        input.actorUserId ?? null,
        input.actorRole ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailById(input.orderId);
      if (!detail) throw new Error('ORDER_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
