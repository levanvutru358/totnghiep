import type { PoolConnection } from 'mysql2/promise';
import type { PaymentTransactionStatus } from '../constants/payments';
import {
  type OrderFulfillmentStatus,
  type OrderPaymentMethod,
  type OrderPaymentStatus,
  type OrderStatus,
} from '../constants/orders';
import type { UserRole } from '../constants/roles';
import { pool } from '../configs/database.config';

export interface PaymentScope {
  userId?: number;
}

export interface PaymentListFilters {
  search?: string;
  status?: PaymentTransactionStatus;
  paymentMethod?: OrderPaymentMethod;
  provider?: string;
  orderId?: number;
  userId?: number;
  page: number;
  limit: number;
}

export interface CreatePaymentInput {
  paymentCode: string;
  orderId: number;
  userId: number;
  paymentMethod: OrderPaymentMethod;
  provider: string;
  initialStatus?: PaymentTransactionStatus;
  amount: number;
  currencyCode: string;
  checkoutUrl?: string | null;
  qrContent?: string | null;
  deepLink?: string | null;
  gatewayTransactionId?: string | null;
  gatewayReference?: string | null;
  metadataJson?: string | null;
  expiresAt?: Date | null;
  note?: string | null;
  actorUserId?: number | null;
}

export interface CompletePaymentInput {
  paymentCode: string;
  gatewayTransactionId?: string | null;
  gatewayReference?: string | null;
  metadataJson?: string | null;
  note?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
}

export interface FailPaymentInput {
  paymentCode: string;
  failureReason?: string | null;
  metadataJson?: string | null;
  note?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
}

export interface ResolvePaymentStatusInput {
  paymentCode: string;
  status: Extract<PaymentTransactionStatus, 'FAILED' | 'CANCELLED' | 'EXPIRED'>;
  failureReason?: string | null;
  metadataJson?: string | null;
  note?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
}

export interface RefundPaymentInput {
  paymentCode: string;
  refundReason?: string | null;
  metadataJson?: string | null;
  note?: string | null;
  actorUserId?: number | null;
  actorRole?: UserRole | null;
}

const paymentBaseSelect = `
  SELECT
    p.id,
    p.payment_code,
    p.order_id,
    p.user_id,
    p.payment_method,
    p.provider,
    p.status,
    p.amount,
    p.currency_code,
    p.checkout_url,
    p.qr_content,
    p.deep_link,
    p.gateway_transaction_id,
    p.gateway_reference,
    p.failure_reason,
    p.refund_reason,
    p.metadata_json,
    p.expires_at,
    p.paid_at,
    p.refunded_at,
    p.created_at,
    p.updated_at,
    o.order_code,
    o.status AS order_status,
    o.payment_status AS order_payment_status,
    o.fulfillment_status AS order_fulfillment_status,
    o.total_amount AS order_total_amount,
    o.currency_code AS order_currency_code,
    u.email AS user_email,
    u.full_name AS user_full_name
  FROM payments p
  INNER JOIN orders o ON o.id = p.order_id
  INNER JOIN users u ON u.id = p.user_id
`;

const buildWhereClause = (
  filters: PaymentListFilters,
  scope?: PaymentScope,
): { whereSql: string; params: unknown[] } => {
  const clauses: string[] = ['1 = 1'];
  const params: unknown[] = [];

  if (scope?.userId) {
    clauses.push('p.user_id = ?');
    params.push(scope.userId);
  }

  if (filters.userId) {
    clauses.push('p.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.orderId) {
    clauses.push('p.order_id = ?');
    params.push(filters.orderId);
  }

  if (filters.status) {
    clauses.push('p.status = ?');
    params.push(filters.status);
  }

  if (filters.paymentMethod) {
    clauses.push('p.payment_method = ?');
    params.push(filters.paymentMethod);
  }

  if (filters.provider) {
    clauses.push('p.provider = ?');
    params.push(filters.provider);
  }

  if (filters.search) {
    clauses.push('(p.payment_code LIKE ? OR o.order_code LIKE ? OR COALESCE(p.gateway_reference, \'\') LIKE ?)');
    const keyword = `%${filters.search}%`;
    params.push(keyword, keyword, keyword);
  }

  return { whereSql: clauses.join(' AND '), params };
};

const insertPaymentEvent = async (
  connection: PoolConnection,
  paymentId: number,
  eventType: string,
  status: PaymentTransactionStatus,
  note?: string | null,
  payloadJson?: string | null,
  actorUserId?: number | null,
) => {
  await connection.query(
    `INSERT INTO payment_events (
      payment_id, event_type, status, note, payload_json, actor_user_id
    ) VALUES (?, ?, ?, ?, ?, ?)`,
    [
      paymentId,
      eventType,
      status,
      note ?? null,
      payloadJson ?? null,
      actorUserId ?? null,
    ],
  );
};

const insertOrderHistory = async (
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

const getTerminalStatusEventType = (
  status: Extract<PaymentTransactionStatus, 'FAILED' | 'CANCELLED' | 'EXPIRED'>,
): string => {
  if (status === 'CANCELLED') return 'PAYMENT_CANCELLED';
  if (status === 'EXPIRED') return 'PAYMENT_EXPIRED';
  return 'PAYMENT_FAILED';
};

const orderCancellableStatuses = new Set<OrderStatus>([
  'PENDING_PAYMENT',
  'PLACED',
  'CONFIRMED',
]);

const truncateText = (value: string | null | undefined, limit: number): string | null => {
  if (!value) return null;
  return value.length <= limit ? value : value.slice(0, limit);
};

const restockOrderItems = async (
  connection: PoolConnection,
  orderId: number,
  orderCode: string,
  note: string,
) => {
  const [itemRows] = await connection.query(
    `SELECT variant_id, quantity
     FROM order_items
     WHERE order_id = ?`,
    [orderId],
  );

  for (const item of itemRows as Array<{ variant_id: number; quantity: number }>) {
    await connection.query(
      `UPDATE product_variants
       SET stock_quantity = stock_quantity + ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [Number(item.quantity || 0), Number(item.variant_id)],
    );

    await connection.query(
      `INSERT INTO inventory_transactions (
        variant_id, transaction_type, quantity, note, reference_code, created_by
      ) VALUES (?, 'IN', ?, ?, ?, NULL)`,
      [Number(item.variant_id), Number(item.quantity || 0), note, orderCode],
    );
  }
};

const canCancelLinkedOrder = (payment: {
  order_status: unknown;
  order_payment_status: unknown;
}) => {
  const orderStatus = String(payment.order_status) as OrderStatus;
  const orderPaymentStatus = String(payment.order_payment_status);

  if (orderStatus === 'CANCELLED' || orderStatus === 'REFUNDED') return false;
  if (orderPaymentStatus === 'PAID' || orderPaymentStatus === 'REFUNDED') return false;
  return orderCancellableStatuses.has(orderStatus);
};

const cancelLinkedOrder = async (
  connection: PoolConnection,
  payment: {
    order_id: number;
    order_code: string;
    order_status: unknown;
    order_payment_status: unknown;
    order_fulfillment_status: unknown;
  },
  cancelReason: string | null,
  actorUserId?: number | null,
  actorRole?: UserRole | null,
) => {
  if (!canCancelLinkedOrder(payment)) return false;

  const reason =
    truncateText(cancelReason, 255) ?? 'Customer cancelled order via payment cancellation';
  const restockNote = reason;

  await restockOrderItems(connection, Number(payment.order_id), String(payment.order_code), restockNote);

  await connection.query(
    `UPDATE orders
     SET status = 'CANCELLED',
         fulfillment_status = 'CANCELLED',
         payment_status = 'UNPAID',
         cancel_reason = ?,
         cancelled_at = CURRENT_TIMESTAMP,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [reason, Number(payment.order_id)],
  );

  await insertOrderHistory(
    connection,
    Number(payment.order_id),
    'ORDER_CANCELLED',
    'CANCELLED',
    'UNPAID',
    'CANCELLED',
    reason,
    actorUserId ?? null,
    actorRole ?? null,
  );

  return true;
};

const getTerminalStatusNote = (
  status: Extract<PaymentTransactionStatus, 'FAILED' | 'CANCELLED' | 'EXPIRED'>,
): string => {
  if (status === 'CANCELLED') return 'Payment cancelled';
  if (status === 'EXPIRED') return 'Payment expired';
  return 'Payment failed';
};

const loadPaymentRow = async (paymentCode: string, scope?: PaymentScope): Promise<any | null> => {
  const scopeSql = scope?.userId ? ' AND p.user_id = ?' : '';
  const scopeParams = scope?.userId ? [scope.userId] : [];

  const [rows] = await pool.query(
    `${paymentBaseSelect}
     WHERE p.payment_code = ?${scopeSql}
     LIMIT 1`,
    [paymentCode, ...scopeParams],
  );

  return (rows as any[])[0] || null;
};

const loadPaymentRowByGatewayReference = async (
  gatewayReference: string,
  provider?: string,
): Promise<any | null> => {
  const providerSql = provider ? ' AND p.provider = ?' : '';
  const providerParams = provider ? [provider] : [];

  const [rows] = await pool.query(
    `${paymentBaseSelect}
     WHERE p.gateway_reference = ?${providerSql}
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [gatewayReference, ...providerParams],
  );

  return (rows as any[])[0] || null;
};

const loadPaymentRowByGatewayTransactionId = async (
  gatewayTransactionId: string,
  provider?: string,
): Promise<any | null> => {
  const providerSql = provider ? ' AND p.provider = ?' : '';
  const providerParams = provider ? [provider] : [];

  const [rows] = await pool.query(
    `${paymentBaseSelect}
     WHERE p.gateway_transaction_id = ?${providerSql}
     ORDER BY p.created_at DESC
     LIMIT 1`,
    [gatewayTransactionId, ...providerParams],
  );

  return (rows as any[])[0] || null;
};

export const paymentRepository = {
  async runWithOrderCheckoutLock<T>(orderId: number, task: () => Promise<T>) {
    const connection = await pool.getConnection();
    const lockName = `payment_checkout_order_${orderId}`;

    try {
      const [rows] = await connection.query(
        `SELECT GET_LOCK(?, 10) AS acquired`,
        [lockName],
      );

      const acquired = Number((rows as any[])[0]?.acquired || 0) === 1;
      if (!acquired) throw new Error('PAYMENT_CHECKOUT_LOCK_TIMEOUT');

      return await task();
    } finally {
      try {
        await connection.query(`SELECT RELEASE_LOCK(?)`, [lockName]);
      } catch {
        // Ignore release failures because MySQL releases named locks when the connection closes.
      }
      connection.release();
    }
  },

  async list(filters: PaymentListFilters, scope?: PaymentScope) {
    const { whereSql, params } = buildWhereClause(filters, scope);
    const offset = (filters.page - 1) * filters.limit;

    const [rows] = await pool.query(
      `${paymentBaseSelect}
       WHERE ${whereSql}
       ORDER BY p.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM payments p
       INNER JOIN orders o ON o.id = p.order_id
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

  async listByOrder(orderId: number, scope?: PaymentScope) {
    const [rows] = await pool.query(
      `${paymentBaseSelect}
       WHERE p.order_id = ?${scope?.userId ? ' AND p.user_id = ?' : ''}
       ORDER BY p.created_at DESC`,
      scope?.userId ? [orderId, scope.userId] : [orderId],
    );

    return rows as any[];
  },

  async getByCode(paymentCode: string, scope?: PaymentScope) {
    return loadPaymentRow(paymentCode, scope);
  },

  async getByGatewayReference(gatewayReference: string, provider?: string) {
    return loadPaymentRowByGatewayReference(gatewayReference, provider);
  },

  async getByGatewayTransactionId(gatewayTransactionId: string, provider?: string) {
    return loadPaymentRowByGatewayTransactionId(gatewayTransactionId, provider);
  },

  async getEvents(paymentId: number) {
    const [rows] = await pool.query(
      `SELECT
         pe.id,
         pe.payment_id,
         pe.event_type,
         pe.status,
         pe.note,
         pe.payload_json,
         pe.actor_user_id,
         pe.created_at,
         u.email AS actor_email,
         u.full_name AS actor_full_name
       FROM payment_events pe
       LEFT JOIN users u ON u.id = pe.actor_user_id
       WHERE pe.payment_id = ?
       ORDER BY pe.created_at ASC, pe.id ASC`,
      [paymentId],
    );

    return rows as any[];
  },

  async getDetailByCode(paymentCode: string, scope?: PaymentScope) {
    const payment = await this.getByCode(paymentCode, scope);
    if (!payment) return null;

    const events = await this.getEvents(Number(payment.id));
    return {
      ...payment,
      events,
    };
  },

  async updateMetadata(paymentCode: string, metadataJson: string) {
    await pool.query(
      `UPDATE payments
       SET metadata_json = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE payment_code = ?`,
      [metadataJson, paymentCode],
    );

    return this.getDetailByCode(paymentCode);
  },

  async getReusablePendingByOrder(orderId: number) {
    const [rows] = await pool.query(
      `${paymentBaseSelect}
       WHERE p.order_id = ?
         AND p.status IN ('PENDING', 'PROCESSING')
         AND (p.expires_at IS NULL OR p.expires_at > CURRENT_TIMESTAMP)
       ORDER BY p.created_at DESC
       LIMIT 1`,
      [orderId],
    );

    return (rows as any[])[0] || null;
  },

  async createCheckout(input: CreatePaymentInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.query(
        `INSERT INTO payments (
          payment_code,
          order_id,
          user_id,
          payment_method,
          provider,
          status,
          amount,
          currency_code,
          checkout_url,
          qr_content,
          deep_link,
          gateway_transaction_id,
          gateway_reference,
          metadata_json,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.paymentCode,
          input.orderId,
          input.userId,
          input.paymentMethod,
          input.provider,
          input.initialStatus ?? 'PENDING',
          input.amount,
          input.currencyCode,
          input.checkoutUrl ?? null,
          input.qrContent ?? null,
          input.deepLink ?? null,
          input.gatewayTransactionId ?? null,
          input.gatewayReference ?? null,
          input.metadataJson ?? null,
          input.expiresAt ?? null,
        ],
      );

      const paymentId = Number((result as any).insertId);

      await insertPaymentEvent(
        connection,
        paymentId,
        'CHECKOUT_CREATED',
        input.initialStatus ?? 'PENDING',
        input.note ?? 'Payment checkout created',
        input.metadataJson ?? null,
        input.actorUserId ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailByCode(input.paymentCode);
      if (!detail) throw new Error('PAYMENT_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async markSucceeded(input: CompletePaymentInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT
           p.id,
           p.order_id,
           p.status,
           p.payment_method,
           o.status AS order_status,
           o.payment_status AS order_payment_status,
           o.fulfillment_status AS order_fulfillment_status
         FROM payments p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE p.payment_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.paymentCode],
      );

      const payment = (rows as any[])[0];
      if (!payment) throw new Error('PAYMENT_NOT_FOUND');
      const currentStatus = String(payment.status);

      if (currentStatus === 'SUCCEEDED' || currentStatus === 'REFUNDED') {
        await connection.commit();

        const detail = await this.getDetailByCode(input.paymentCode);
        if (!detail) throw new Error('PAYMENT_NOT_FOUND');
        return detail;
      }

      if (
        currentStatus === 'FAILED' ||
        currentStatus === 'CANCELLED' ||
        currentStatus === 'EXPIRED'
      ) {
        throw new Error('PAYMENT_FINALIZED');
      }

      const [succeededRows] = await connection.query(
        `SELECT id
         FROM payments
         WHERE order_id = ?
           AND id <> ?
           AND status = 'SUCCEEDED'
         LIMIT 1
         FOR UPDATE`,
        [Number(payment.order_id), Number(payment.id)],
      );

      const existingSucceeded = (succeededRows as any[])[0];
      if (existingSucceeded) {
        await connection.query(
          `UPDATE payments
           SET status = 'CANCELLED',
               failure_reason = 'Another payment for this order has already succeeded',
               metadata_json = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?
             AND status <> 'REFUNDED'`,
          [input.metadataJson ?? null, Number(payment.id)],
        );

        await insertPaymentEvent(
          connection,
          Number(payment.id),
          'PAYMENT_SUPERSEDED',
          'CANCELLED',
          input.note ?? 'Payment ignored because another payment already succeeded',
          input.metadataJson ?? null,
          input.actorUserId ?? null,
        );

        await connection.commit();

        const detail = await this.getDetailByCode(input.paymentCode);
        if (!detail) throw new Error('PAYMENT_NOT_FOUND');
        return detail;
      }

      await connection.query(
        `UPDATE payments
         SET status = 'SUCCEEDED',
             gateway_transaction_id = ?,
             gateway_reference = ?,
             metadata_json = ?,
             paid_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.gatewayTransactionId ?? null,
          input.gatewayReference ?? null,
          input.metadataJson ?? null,
          Number(payment.id),
        ],
      );

      await connection.query(
        `UPDATE payments
         SET status = 'CANCELLED',
             failure_reason = 'Superseded by successful payment',
             updated_at = CURRENT_TIMESTAMP
         WHERE order_id = ?
           AND id <> ?
           AND status IN ('PENDING', 'PROCESSING')`,
        [Number(payment.order_id), Number(payment.id)],
      );

      const nextOrderStatus =
        String(payment.order_status) === 'PENDING_PAYMENT'
          ? 'PLACED'
          : String(payment.order_status);

      await connection.query(
        `UPDATE orders
         SET payment_status = 'PAID',
             status = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [nextOrderStatus, Number(payment.order_id)],
      );

      await insertPaymentEvent(
        connection,
        Number(payment.id),
        'PAYMENT_SUCCEEDED',
        'SUCCEEDED',
        input.note ?? 'Payment succeeded',
        input.metadataJson ?? null,
        input.actorUserId ?? null,
      );

      await insertOrderHistory(
        connection,
        Number(payment.order_id),
        'PAYMENT_MARKED_PAID',
        nextOrderStatus as OrderStatus,
        'PAID',
        String(payment.order_fulfillment_status) as OrderFulfillmentStatus,
        input.note ?? 'Payment succeeded',
        input.actorUserId ?? null,
        input.actorRole ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailByCode(input.paymentCode);
      if (!detail) throw new Error('PAYMENT_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async markFailed(input: FailPaymentInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT
           p.id,
           p.order_id,
           p.status,
           o.status AS order_status,
           o.payment_status AS order_payment_status,
           o.fulfillment_status AS order_fulfillment_status
         FROM payments p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE p.payment_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.paymentCode],
      );

      const payment = (rows as any[])[0];
      if (!payment) throw new Error('PAYMENT_NOT_FOUND');

      await connection.query(
        `UPDATE payments
         SET status = 'FAILED',
             failure_reason = ?,
             metadata_json = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.failureReason ?? null,
          input.metadataJson ?? null,
          Number(payment.id),
        ],
      );

      if (String(payment.order_payment_status) !== 'PAID' && String(payment.order_payment_status) !== 'REFUNDED') {
        await connection.query(
          `UPDATE orders
           SET payment_status = 'FAILED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [Number(payment.order_id)],
        );
      }

      await insertPaymentEvent(
        connection,
        Number(payment.id),
        'PAYMENT_FAILED',
        'FAILED',
        input.note ?? input.failureReason ?? 'Payment failed',
        input.metadataJson ?? null,
        input.actorUserId ?? null,
      );

      await insertOrderHistory(
        connection,
        Number(payment.order_id),
        'PAYMENT_FAILED',
        String(payment.order_status) as OrderStatus,
        'FAILED',
        String(payment.order_fulfillment_status) as OrderFulfillmentStatus,
        input.note ?? input.failureReason ?? 'Payment failed',
        input.actorUserId ?? null,
        input.actorRole ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailByCode(input.paymentCode);
      if (!detail) throw new Error('PAYMENT_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async markTerminalStatus(input: ResolvePaymentStatusInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT
           p.id,
           p.order_id,
           p.status,
           o.order_code AS order_code,
           o.status AS order_status,
           o.payment_status AS order_payment_status,
           o.fulfillment_status AS order_fulfillment_status
         FROM payments p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE p.payment_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.paymentCode],
      );

      const payment = (rows as any[])[0];
      if (!payment) throw new Error('PAYMENT_NOT_FOUND');

      const currentStatus = String(payment.status) as PaymentTransactionStatus;
      if (currentStatus === 'SUCCEEDED' || currentStatus === 'REFUNDED') {
        await connection.commit();

        const detail = await this.getDetailByCode(input.paymentCode);
        if (!detail) throw new Error('PAYMENT_NOT_FOUND');
        return detail;
      }

      if (
        currentStatus === 'FAILED' ||
        currentStatus === 'CANCELLED' ||
        currentStatus === 'EXPIRED'
      ) {
        await connection.query(
          `UPDATE payments
           SET failure_reason = COALESCE(?, failure_reason),
               metadata_json = ?,
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [
            input.failureReason ?? null,
            input.metadataJson ?? null,
            Number(payment.id),
          ],
        );

        if (input.status === 'CANCELLED') {
          await cancelLinkedOrder(
            connection,
            payment,
            input.failureReason ?? input.note ?? null,
            input.actorUserId,
            input.actorRole,
          );
        }

        await connection.commit();

        const detail = await this.getDetailByCode(input.paymentCode);
        if (!detail) throw new Error('PAYMENT_NOT_FOUND');
        return detail;
      }

      await connection.query(
        `UPDATE payments
         SET status = ?,
             failure_reason = ?,
             metadata_json = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.status,
          input.failureReason ?? null,
          input.metadataJson ?? null,
          Number(payment.id),
        ],
      );

      const note =
        input.note ?? input.failureReason ?? getTerminalStatusNote(input.status);
      const eventType = getTerminalStatusEventType(input.status);

      await insertPaymentEvent(
        connection,
        Number(payment.id),
        eventType,
        input.status,
        note,
        input.metadataJson ?? null,
        input.actorUserId ?? null,
      );

      const orderCancelled =
        input.status === 'CANCELLED' &&
        (await cancelLinkedOrder(
          connection,
          payment,
          input.failureReason ?? input.note ?? null,
          input.actorUserId,
          input.actorRole,
        ));

      if (
        !orderCancelled &&
        String(payment.order_payment_status) !== 'PAID' &&
        String(payment.order_payment_status) !== 'REFUNDED'
      ) {
        await connection.query(
          `UPDATE orders
           SET payment_status = 'FAILED',
               updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [Number(payment.order_id)],
        );

        await insertOrderHistory(
          connection,
          Number(payment.order_id),
          eventType,
          String(payment.order_status) as OrderStatus,
          'FAILED',
          String(payment.order_fulfillment_status) as OrderFulfillmentStatus,
          note,
          input.actorUserId ?? null,
          input.actorRole ?? null,
        );
      }

      await connection.commit();

      const detail = await this.getDetailByCode(input.paymentCode);
      if (!detail) throw new Error('PAYMENT_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async refund(input: RefundPaymentInput) {
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(
        `SELECT
           p.id,
           p.order_id,
           p.status,
           o.status AS order_status,
           o.fulfillment_status AS order_fulfillment_status
         FROM payments p
         INNER JOIN orders o ON o.id = p.order_id
         WHERE p.payment_code = ?
         LIMIT 1
         FOR UPDATE`,
        [input.paymentCode],
      );

      const payment = (rows as any[])[0];
      if (!payment) throw new Error('PAYMENT_NOT_FOUND');

      await connection.query(
        `UPDATE payments
         SET status = 'REFUNDED',
             refund_reason = ?,
             metadata_json = ?,
             refunded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [
          input.refundReason ?? null,
          input.metadataJson ?? null,
          Number(payment.id),
        ],
      );

      await connection.query(
        `UPDATE orders
         SET payment_status = 'REFUNDED',
             status = 'REFUNDED',
             refunded_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [Number(payment.order_id)],
      );

      await insertPaymentEvent(
        connection,
        Number(payment.id),
        'PAYMENT_REFUNDED',
        'REFUNDED',
        input.note ?? input.refundReason ?? 'Payment refunded',
        input.metadataJson ?? null,
        input.actorUserId ?? null,
      );

      await insertOrderHistory(
        connection,
        Number(payment.order_id),
        'PAYMENT_REFUNDED',
        'REFUNDED',
        'REFUNDED',
        String(payment.order_fulfillment_status) as OrderFulfillmentStatus,
        input.note ?? input.refundReason ?? 'Payment refunded',
        input.actorUserId ?? null,
        input.actorRole ?? null,
      );

      await connection.commit();

      const detail = await this.getDetailByCode(input.paymentCode);
      if (!detail) throw new Error('PAYMENT_NOT_FOUND');
      return detail;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
