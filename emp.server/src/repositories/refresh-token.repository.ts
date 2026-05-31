import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../configs/database.config';

export const refreshTokenRepository = {
  async insert(
    userId: number,
    tokenHash: string,
    expiresAt: Date,
    meta?: { ipAddress?: string | null; userAgent?: string | null; deviceLabel?: string | null },
  ): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, ip_address, user_agent, device_label)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tokenHash,
        expiresAt,
        meta?.ipAddress ?? null,
        meta?.userAgent?.slice(0, 500) ?? null,
        meta?.deviceLabel ?? null,
      ],
    );
    return result.insertId;
  },

  async listActiveByUser(userId: number) {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id, ip_address, user_agent, device_label, expires_at, created_at
       FROM refresh_tokens
       WHERE user_id = ? AND revoked_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC`,
      [userId],
    );
    return rows as any[];
  },

  async findValidByHash(tokenHash: string): Promise<{ id: number; user_id: number } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id FROM refresh_tokens
       WHERE token_hash = ? AND revoked_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0] as { id: number; user_id: number } | undefined;
    return row ?? null;
  },

  async revokeById(id: number): Promise<void> {
    await pool.query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },

  async revokeByHash(tokenHash: string): Promise<void> {
    await pool.query(`UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE token_hash = ?`, [
      tokenHash,
    ]);
  },

  async revokeAllForUser(userId: number): Promise<void> {
    await pool.query(
      `UPDATE refresh_tokens SET revoked_at = CURRENT_TIMESTAMP WHERE user_id = ? AND revoked_at IS NULL`,
      [userId],
    );
  },
};
