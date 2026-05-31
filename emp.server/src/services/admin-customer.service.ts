import { accountLockService } from './account-lock.service';
import { customerRepository } from '../repositories/customer.repository';
import { loginLogRepository } from '../repositories/login-log.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository } from '../repositories/user.repository';

const toPositive = (v: unknown) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : undefined;
};

const MAX_FULL_NAME_LEN = 120;

const normalizeFullName = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('INVALID_FULL_NAME');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FULL_NAME_LEN) throw new Error('INVALID_FULL_NAME');
  return trimmed;
};

const normalizeLockReason = (value: unknown) => {
  const reason = typeof value === 'string' ? value.trim() : '';
  if (reason.length < 3) throw new Error('INVALID_LOCK_REASON');
  if (reason.length > 500) throw new Error('INVALID_LOCK_REASON');
  return reason;
};

const mapCustomer = (row: any) => ({
  id: Number(row.id),
  email: row.email,
  fullName: row.full_name ?? null,
  isActive: Boolean(row.is_active),
  accountStatus: row.account_status as 'ACTIVE' | 'LOCKED' | 'TEMP_LOCKED',
  lockReason: row.lock_reason ?? null,
  lockedUntil: row.locked_until ?? null,
  lockedAt: row.locked_at ?? null,
  orderCount: Number(row.order_count || 0),
  totalSpent: Number(row.total_spent || 0),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const mapOrder = (row: any) => ({
  id: Number(row.id),
  orderCode: row.order_code,
  status: row.status,
  paymentStatus: row.payment_status,
  totalAmount: Number(row.total_amount || 0),
  currencyCode: row.currency_code ?? 'VND',
  createdAt: row.created_at,
});

export const adminCustomerService = {
  async list(query: Record<string, unknown>) {
    const page = toPositive(query.page) ?? 1;
    const limit = Math.min(toPositive(query.limit) ?? 20, 100);
    const statusRaw = String(query.status ?? 'all').toLowerCase();
    const status =
      statusRaw === 'active' || statusRaw === 'locked' || statusRaw === 'temp_locked'
        ? (statusRaw as 'active' | 'locked' | 'temp_locked')
        : 'all';

    const result = await customerRepository.list({
      search: typeof query.search === 'string' ? query.search.trim() : undefined,
      status,
      page,
      limit,
    });

    return { ...result, items: result.items.map(mapCustomer) };
  },

  async detail(customerId: number) {
    let row = await customerRepository.getById(customerId);
    if (!row) throw new Error('CUSTOMER_NOT_FOUND');

    const user = await userRepository.findById(customerId);
    if (user) {
      const fresh = await accountLockService.refreshLockState(user);
      row = (await customerRepository.getById(customerId)) ?? row;
      if (fresh.account_status !== row.account_status) {
        row.account_status = fresh.account_status;
        row.lock_reason = fresh.lock_reason;
        row.locked_until = fresh.locked_until;
        row.is_active = fresh.is_active;
      }
    }

    const [recentOrders, addresses, reviews, comments, loginLogs, devices] = await Promise.all([
      customerRepository.getRecentOrders(customerId),
      customerRepository.getAddressesFromOrders(customerId),
      customerRepository.getReviews(customerId),
      customerRepository.getComments(customerId),
      loginLogRepository.listByUser(customerId),
      refreshTokenRepository.listActiveByUser(customerId),
    ]);

    return {
      ...mapCustomer(row),
      recentOrders: recentOrders.map(mapOrder),
      addresses: addresses.map((a: any) => ({
        recipientName: a.recipient_name,
        recipientPhone: a.recipient_phone,
        line1: a.shipping_address_line1,
        line2: a.shipping_address_line2 ?? null,
        ward: a.shipping_ward ?? null,
        district: a.shipping_district,
        province: a.shipping_province,
        postalCode: a.shipping_postal_code ?? null,
        usedCount: Number(a.used_count || 0),
        lastUsedAt: a.last_used_at,
      })),
      reviews: reviews.map((r: any) => ({
        id: Number(r.id),
        productId: Number(r.product_id),
        productName: r.product_name,
        rating: Number(r.rating),
        title: r.title ?? null,
        content: r.content,
        status: r.status,
        createdAt: r.created_at,
      })),
      comments: comments.map((c: any) => ({
        id: Number(c.id),
        productId: Number(c.product_id),
        productName: c.product_name,
        content: c.content,
        status: c.status,
        parentId: c.parent_id ? Number(c.parent_id) : null,
        createdAt: c.created_at,
      })),
      loginLogs: loginLogs.map((l: any) => ({
        id: Number(l.id),
        ipAddress: l.ip_address ?? null,
        userAgent: l.user_agent ?? null,
        deviceLabel: l.device_label ?? null,
        isSuccess: Boolean(l.is_success),
        failureReason: l.failure_reason ?? null,
        createdAt: l.created_at,
      })),
      devices: devices.map((d: any) => ({
        id: Number(d.id),
        ipAddress: d.ip_address ?? null,
        deviceLabel: d.device_label ?? null,
        expiresAt: d.expires_at,
        createdAt: d.created_at,
      })),
    };
  },

  async update(customerId: number, body: Record<string, unknown>) {
    const row = await customerRepository.getById(customerId);
    if (!row) throw new Error('CUSTOMER_NOT_FOUND');
    if (typeof body.fullName === 'undefined') throw new Error('NO_UPDATABLE_FIELDS');
    const updated = await customerRepository.update(customerId, {
      fullName: normalizeFullName(body.fullName),
    });
    if (!updated) throw new Error('CUSTOMER_NOT_FOUND');
    return mapCustomer(updated);
  },

  async lock(customerId: number, adminId: number, body: Record<string, unknown>) {
    const row = await customerRepository.getById(customerId);
    if (!row) throw new Error('CUSTOMER_NOT_FOUND');
    const reason = normalizeLockReason(body.reason);
    await userRepository.lockPermanent(customerId, reason, adminId);
    const updated = await customerRepository.getById(customerId);
    return mapCustomer(updated);
  },

  async tempLock(customerId: number, adminId: number, body: Record<string, unknown>) {
    const row = await customerRepository.getById(customerId);
    if (!row) throw new Error('CUSTOMER_NOT_FOUND');
    const reason = normalizeLockReason(body.reason);
    const lockedUntilRaw = body.lockedUntil ?? body.locked_until;
    const durationHours = toPositive(body.durationHours ?? body.duration_hours);

    let lockedUntil: Date;
    if (typeof lockedUntilRaw === 'string' && lockedUntilRaw.trim()) {
      lockedUntil = new Date(lockedUntilRaw);
    } else if (durationHours) {
      lockedUntil = new Date(Date.now() + durationHours * 60 * 60 * 1000);
    } else {
      throw new Error('INVALID_LOCK_DURATION');
    }
    if (Number.isNaN(lockedUntil.getTime()) || lockedUntil <= new Date()) {
      throw new Error('INVALID_LOCK_DURATION');
    }

    await userRepository.lockTemporary(customerId, reason, lockedUntil, adminId);
    const updated = await customerRepository.getById(customerId);
    return mapCustomer(updated);
  },

  async unlock(customerId: number) {
    const row = await customerRepository.getById(customerId);
    if (!row) throw new Error('CUSTOMER_NOT_FOUND');
    await userRepository.unlockAccount(customerId);
    const updated = await customerRepository.getById(customerId);
    return mapCustomer(updated);
  },
};
