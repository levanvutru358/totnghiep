import { pool } from '../configs/database.config';

export interface UserAddressRow {
  id: number;
  user_id: number;
  label: string | null;
  recipient_name: string;
  recipient_phone: string;
  address_line1: string;
  address_line2: string | null;
  ward: string | null;
  district: string;
  province: string;
  postal_code: string | null;
  country: string;
  is_default: number;
  created_at: Date;
  updated_at: Date;
}

export interface UpsertAddressInput {
  userId: number;
  label?: string | null;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  ward?: string | null;
  district: string;
  province: string;
  postalCode?: string | null;
  country?: string;
  isDefault?: boolean;
}

const mapRow = (row: Record<string, unknown>): UserAddressRow => ({
  id: Number(row.id),
  user_id: Number(row.user_id),
  label: row.label == null ? null : String(row.label),
  recipient_name: String(row.recipient_name),
  recipient_phone: String(row.recipient_phone),
  address_line1: String(row.address_line1),
  address_line2: row.address_line2 == null ? null : String(row.address_line2),
  ward: row.ward == null ? null : String(row.ward),
  district: String(row.district),
  province: String(row.province),
  postal_code: row.postal_code == null ? null : String(row.postal_code),
  country: String(row.country || 'VN'),
  is_default: Number(row.is_default || 0),
  created_at: new Date(String(row.created_at)),
  updated_at: new Date(String(row.updated_at)),
});

export const addressRepository = {
  async countByUser(userId: number): Promise<number> {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?`,
      [userId],
    );
    return Number((rows as { total: number }[])[0]?.total || 0);
  },

  async listByUser(userId: number): Promise<UserAddressRow[]> {
    const [rows] = await pool.query(
      `SELECT *
       FROM user_addresses
       WHERE user_id = ?
       ORDER BY is_default DESC, updated_at DESC`,
      [userId],
    );
    return (rows as Record<string, unknown>[]).map(mapRow);
  },

  async findByIdForUser(addressId: number, userId: number): Promise<UserAddressRow | null> {
    const [rows] = await pool.query(
      `SELECT * FROM user_addresses WHERE id = ? AND user_id = ? LIMIT 1`,
      [addressId, userId],
    );
    const row = (rows as Record<string, unknown>[])[0];
    return row ? mapRow(row) : null;
  },

  async findDuplicate(input: UpsertAddressInput): Promise<UserAddressRow | null> {
    const [rows] = await pool.query(
      `SELECT *
       FROM user_addresses
       WHERE user_id = ?
         AND recipient_phone = ?
         AND address_line1 = ?
         AND district = ?
         AND province = ?
       LIMIT 1`,
      [input.userId, input.recipientPhone, input.addressLine1, input.district, input.province],
    );
    const row = (rows as Record<string, unknown>[])[0];
    return row ? mapRow(row) : null;
  },

  async clearDefault(userId: number, connection?: { query: typeof pool.query }) {
    const exec = connection?.query ?? pool.query.bind(pool);
    await exec(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
  },

  async create(input: UpsertAddressInput): Promise<UserAddressRow> {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const countRows = await connection.query(
        `SELECT COUNT(*) AS total FROM user_addresses WHERE user_id = ?`,
        [input.userId],
      );
      const total = Number((countRows[0] as { total: number }[])[0]?.total || 0);
      const shouldDefault = input.isDefault === true || total === 0;

      if (shouldDefault) {
        await connection.query(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [
          input.userId,
        ]);
      }

      const [result] = await connection.query(
        `INSERT INTO user_addresses (
          user_id, label, recipient_name, recipient_phone,
          address_line1, address_line2, ward, district, province, postal_code, country, is_default
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          input.userId,
          input.label ?? null,
          input.recipientName,
          input.recipientPhone,
          input.addressLine1,
          input.addressLine2 ?? null,
          input.ward ?? null,
          input.district,
          input.province,
          input.postalCode ?? null,
          input.country ?? 'VN',
          shouldDefault ? 1 : 0,
        ],
      );

      await connection.commit();
      const insertId = Number((result as { insertId: number }).insertId);
      const created = await this.findByIdForUser(insertId, input.userId);
      if (!created) throw new Error('ADDRESS_CREATE_FAILED');
      return created;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async update(addressId: number, userId: number, input: Partial<UpsertAddressInput>): Promise<UserAddressRow> {
    const existing = await this.findByIdForUser(addressId, userId);
    if (!existing) throw new Error('ADDRESS_NOT_FOUND');

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      if (input.isDefault === true) {
        await connection.query(`UPDATE user_addresses SET is_default = 0 WHERE user_id = ?`, [userId]);
      }

      await connection.query(
        `UPDATE user_addresses
         SET label = ?,
             recipient_name = ?,
             recipient_phone = ?,
             address_line1 = ?,
             address_line2 = ?,
             ward = ?,
             district = ?,
             province = ?,
             postal_code = ?,
             country = ?,
             is_default = ?,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ?`,
        [
          input.label !== undefined ? input.label : existing.label,
          input.recipientName ?? existing.recipient_name,
          input.recipientPhone ?? existing.recipient_phone,
          input.addressLine1 ?? existing.address_line1,
          input.addressLine2 !== undefined ? input.addressLine2 : existing.address_line2,
          input.ward !== undefined ? input.ward : existing.ward,
          input.district ?? existing.district,
          input.province ?? existing.province,
          input.postalCode !== undefined ? input.postalCode : existing.postal_code,
          input.country ?? existing.country,
          input.isDefault === true ? 1 : input.isDefault === false ? 0 : existing.is_default,
          addressId,
          userId,
        ],
      );

      await connection.commit();
      const updated = await this.findByIdForUser(addressId, userId);
      if (!updated) throw new Error('ADDRESS_NOT_FOUND');
      return updated;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },

  async remove(addressId: number, userId: number): Promise<void> {
    const existing = await this.findByIdForUser(addressId, userId);
    if (!existing) throw new Error('ADDRESS_NOT_FOUND');

    await pool.query(`DELETE FROM user_addresses WHERE id = ? AND user_id = ?`, [addressId, userId]);

    if (existing.is_default) {
      const [rows] = await pool.query(
        `SELECT id FROM user_addresses WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`,
        [userId],
      );
      const next = (rows as { id: number }[])[0];
      if (next) {
        await pool.query(`UPDATE user_addresses SET is_default = 1 WHERE id = ?`, [next.id]);
      }
    }
  },
};
