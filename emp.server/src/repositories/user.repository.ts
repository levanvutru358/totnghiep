import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../configs/database.config';
import type { UserRole } from '../constants/roles';

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'TEMP_LOCKED';

export interface UserRow {
  id: number;
  email: string;
  password_hash: string;
  full_name: string | null;
  role: UserRole;
  is_active: number;
  account_status: AccountStatus;
  lock_reason: string | null;
  locked_until: Date | null;
  locked_at: Date | null;
  locked_by: number | null;
  created_at: Date;
  updated_at: Date;
}

const userSelect = `
  u.id, u.email, u.password_hash, u.full_name, r.code AS role, u.is_active,
  u.account_status, u.lock_reason, u.locked_until, u.locked_at, u.locked_by,
  u.created_at, u.updated_at
`;

export interface CreateUserInput {
  email: string;
  passwordHash: string;
  fullName?: string | null;
  role: UserRole;
}

export const userRepository = {
  async findByEmail(email: string): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${userSelect}
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.email = ?
       LIMIT 1`,
      [email.toLowerCase().trim()],
    );
    const row = rows[0] as UserRow | undefined;
    return row ?? null;
  },

  async findById(id: number): Promise<UserRow | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${userSelect}
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.id = ?
       LIMIT 1`,
      [id],
    );
    const row = rows[0] as UserRow | undefined;
    return row ?? null;
  },

  async findByMentionHandle(rawHandle: string): Promise<UserRow | null> {
    const handle = rawHandle.trim().replace(/^@+/, '').toLowerCase();
    if (!handle) return null;

    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT ${userSelect}
       FROM users u
       INNER JOIN roles r ON r.id = u.role_id
       WHERE u.is_active = 1
         AND (
           LOWER(u.email) = ?
           OR LOWER(SUBSTRING_INDEX(u.email, '@', 1)) = ?
           OR LOWER(u.full_name) = ?
           OR REPLACE(LOWER(u.full_name), ' ', '') = ?
         )
       ORDER BY u.id ASC
       LIMIT 1`,
      [handle, handle, handle, handle.replace(/\s+/g, '')],
    );
    const row = rows[0] as UserRow | undefined;
    return row ?? null;
  },

  async create(input: CreateUserInput): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO users (email, password_hash, full_name, role_id, is_active)
       SELECT ?, ?, ?, r.id, 1
       FROM roles r
       WHERE r.code = ?`,
      [
        input.email.toLowerCase().trim(),
        input.passwordHash,
        input.fullName ?? null,
        input.role,
      ],
    );
    return result.insertId;
  },

  async updatePasswordHash(userId: number, passwordHash: string): Promise<void> {
    await pool.query(`UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      passwordHash,
      userId,
    ]);
  },

  async updateProfile(userId: number, input: { fullName: string | null }): Promise<void> {
    await pool.query(`UPDATE users SET full_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [
      input.fullName,
      userId,
    ]);
  },

  async unlockAccount(userId: number) {
    await pool.query(
      `UPDATE users
       SET is_active = 1, account_status = 'ACTIVE', lock_reason = NULL, locked_until = NULL,
           locked_at = NULL, locked_by = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [userId],
    );
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  },

  async lockPermanent(userId: number, reason: string, adminId: number) {
    await pool.query(
      `UPDATE users
       SET is_active = 0, account_status = 'LOCKED', lock_reason = ?, locked_until = NULL,
           locked_at = CURRENT_TIMESTAMP, locked_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, adminId, userId],
    );
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  },

  async lockTemporary(userId: number, reason: string, lockedUntil: Date, adminId: number) {
    await pool.query(
      `UPDATE users
       SET is_active = 0, account_status = 'TEMP_LOCKED', lock_reason = ?, locked_until = ?,
           locked_at = CURRENT_TIMESTAMP, locked_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [reason, lockedUntil, adminId, userId],
    );
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  },
};
