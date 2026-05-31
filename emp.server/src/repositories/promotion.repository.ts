import { pool } from '../configs/database.config';
import type { PromotionDiscountType } from '../constants/promotions';

export interface PromotionCodeRow {
  id: number;
  code: string;
  name: string;
  description: string | null;
  discount_type: PromotionDiscountType;
  discount_value: number;
  max_discount_amount: number | null;
  min_order_amount: number;
  usage_limit: number | null;
  usage_limit_per_user: number | null;
  used_count: number;
  starts_at: Date | null;
  ends_at: Date | null;
  is_active: number;
  created_at: Date;
  updated_at: Date;
}

export interface PromotionListFilters {
  search?: string;
  isActive?: boolean;
  page: number;
  limit: number;
}

export interface CreatePromotionInput {
  code: string;
  name: string;
  description?: string | null;
  discountType: PromotionDiscountType;
  discountValue: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  usageLimit?: number | null;
  usageLimitPerUser?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
}

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

const mapRow = (row: Record<string, unknown>): PromotionCodeRow => ({
  id: Number(row.id),
  code: String(row.code),
  name: String(row.name),
  description: row.description == null ? null : String(row.description),
  discount_type: String(row.discount_type) as PromotionDiscountType,
  discount_value: Number(row.discount_value || 0),
  max_discount_amount:
    row.max_discount_amount == null ? null : Number(row.max_discount_amount),
  min_order_amount: Number(row.min_order_amount || 0),
  usage_limit: row.usage_limit == null ? null : Number(row.usage_limit),
  usage_limit_per_user:
    row.usage_limit_per_user == null ? null : Number(row.usage_limit_per_user),
  used_count: Number(row.used_count || 0),
  starts_at: row.starts_at ? new Date(String(row.starts_at)) : null,
  ends_at: row.ends_at ? new Date(String(row.ends_at)) : null,
  is_active: Number(row.is_active || 0),
  created_at: new Date(String(row.created_at)),
  updated_at: new Date(String(row.updated_at)),
});

export const promotionRepository = {
  async findByCode(code: string): Promise<PromotionCodeRow | null> {
    const [rows] = await pool.query(
      `SELECT *
       FROM promotion_codes
       WHERE UPPER(code) = UPPER(?)
       LIMIT 1`,
      [code.trim()],
    );
    const row = (rows as Record<string, unknown>[])[0];
    return row ? mapRow(row) : null;
  },

  async findById(id: number): Promise<PromotionCodeRow | null> {
    const [rows] = await pool.query(`SELECT * FROM promotion_codes WHERE id = ? LIMIT 1`, [id]);
    const row = (rows as Record<string, unknown>[])[0];
    return row ? mapRow(row) : null;
  },

  async countUserUsages(promotionId: number, userId: number): Promise<number> {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM promotion_code_usages
       WHERE promotion_code_id = ? AND user_id = ?`,
      [promotionId, userId],
    );
    return Number((rows as { total: number }[])[0]?.total || 0);
  },

  /** Fallback safety: count orders that already used this voucher code. */
  async countUserOrderUsagesByCode(code: string, userId: number): Promise<number> {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM orders
       WHERE user_id = ?
         AND UPPER(COALESCE(voucher_code, '')) = UPPER(?)`,
      [userId, code.trim()],
    );
    return Number((rows as { total: number }[])[0]?.total || 0);
  },

  async listAvailableForShop(limit = 20): Promise<PromotionCodeRow[]> {
    const [rows] = await pool.query(
      `SELECT *
       FROM promotion_codes
       WHERE is_active = 1
         AND (starts_at IS NULL OR starts_at <= NOW())
         AND (ends_at IS NULL OR ends_at >= NOW())
         AND (usage_limit IS NULL OR used_count < usage_limit)
       ORDER BY min_order_amount ASC, id ASC
       LIMIT ?`,
      [limit],
    );
    return (rows as Record<string, unknown>[]).map(mapRow);
  },

  async listAvailableForUser(userId: number, limit = 30): Promise<
    Array<PromotionCodeRow & { alreadyUsed: boolean }>
  > {
    const rows = await this.listAvailableForShop(limit);
    const enriched = await Promise.all(
      rows.map(async (row) => {
        const [usageCount, orderCount] = await Promise.all([
          this.countUserUsages(row.id, userId),
          this.countUserOrderUsagesByCode(row.code, userId),
        ]);
        const perUserLimit = row.usage_limit_per_user ?? 1;
        const alreadyUsed = usageCount >= perUserLimit || orderCount >= perUserLimit;
        return { ...row, alreadyUsed };
      }),
    );
    return enriched;
  },

  async list(filters: PromotionListFilters) {
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (filters.search) {
      conditions.push('(code LIKE ? OR name LIKE ?)');
      const term = `%${filters.search}%`;
      params.push(term, term);
    }

    if (typeof filters.isActive === 'boolean') {
      conditions.push('is_active = ?');
      params.push(filters.isActive ? 1 : 0);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (filters.page - 1) * filters.limit;

    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM promotion_codes ${where}`,
      params,
    );
    const total = Number((countRows as { total: number }[])[0]?.total || 0);

    const [rows] = await pool.query(
      `SELECT *
       FROM promotion_codes
       ${where}
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, filters.limit, offset],
    );

    return {
      items: (rows as Record<string, unknown>[]).map(mapRow),
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / filters.limit)),
    };
  },

  async create(input: CreatePromotionInput): Promise<PromotionCodeRow> {
    const [result] = await pool.query(
      `INSERT INTO promotion_codes (
        code, name, description, discount_type, discount_value,
        max_discount_amount, min_order_amount, usage_limit, usage_limit_per_user,
        starts_at, ends_at, is_active
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code.trim().toUpperCase(),
        input.name.trim(),
        input.description ?? null,
        input.discountType,
        input.discountValue,
        input.maxDiscountAmount ?? null,
        input.minOrderAmount,
        input.usageLimit ?? null,
        input.usageLimitPerUser ?? null,
        input.startsAt ?? null,
        input.endsAt ?? null,
        input.isActive ? 1 : 0,
      ],
    );

    const insertId = Number((result as { insertId: number }).insertId);
    const created = await this.findById(insertId);
    if (!created) throw new Error('PROMOTION_CREATE_FAILED');
    return created;
  },

  async update(id: number, input: UpdatePromotionInput): Promise<PromotionCodeRow> {
    const updates: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown) => {
      updates.push(`${column} = ?`);
      params.push(value);
    };

    if (typeof input.code === 'string') setField('code', input.code.trim().toUpperCase());
    if (typeof input.name === 'string') setField('name', input.name.trim());
    if (typeof input.description !== 'undefined') setField('description', input.description);
    if (typeof input.discountType === 'string') setField('discount_type', input.discountType);
    if (typeof input.discountValue === 'number') setField('discount_value', input.discountValue);
    if (typeof input.maxDiscountAmount !== 'undefined') {
      setField('max_discount_amount', input.maxDiscountAmount);
    }
    if (typeof input.minOrderAmount === 'number') setField('min_order_amount', input.minOrderAmount);
    if (typeof input.usageLimit !== 'undefined') setField('usage_limit', input.usageLimit);
    if (typeof input.usageLimitPerUser !== 'undefined') {
      setField('usage_limit_per_user', input.usageLimitPerUser);
    }
    if (typeof input.startsAt !== 'undefined') setField('starts_at', input.startsAt);
    if (typeof input.endsAt !== 'undefined') setField('ends_at', input.endsAt);
    if (typeof input.isActive === 'boolean') setField('is_active', input.isActive ? 1 : 0);

    if (updates.length === 0) {
      const existing = await this.findById(id);
      if (!existing) throw new Error('PROMOTION_NOT_FOUND');
      return existing;
    }

    await pool.query(
      `UPDATE promotion_codes SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [...params, id],
    );

    const updated = await this.findById(id);
    if (!updated) throw new Error('PROMOTION_NOT_FOUND');
    return updated;
  },

  async remove(id: number): Promise<void> {
    const [result] = await pool.query(`DELETE FROM promotion_codes WHERE id = ?`, [id]);
    const affected = Number((result as { affectedRows: number }).affectedRows || 0);
    if (affected === 0) throw new Error('PROMOTION_NOT_FOUND');
  },

  async recordUsage(promotionId: number, userId: number, orderId: number): Promise<void> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      await connection.query(
        `INSERT INTO promotion_code_usages (promotion_code_id, user_id, order_id)
         VALUES (?, ?, ?)`,
        [promotionId, userId, orderId],
      );

      await connection.query(
        `UPDATE promotion_codes
         SET used_count = used_count + 1, updated_at = CURRENT_TIMESTAMP
         WHERE id = ?`,
        [promotionId],
      );

      await connection.commit();
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
