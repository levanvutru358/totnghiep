import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { pool } from '../configs/database.config';

export const passwordResetRepository = {
  async insert(userId: number, tokenHash: string, expiresAt: Date): Promise<number> {
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)`,
      [userId, tokenHash, expiresAt],
    );
    return result.insertId;
  },

  async findValidByHash(tokenHash: string): Promise<{ id: number; user_id: number } | null> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id FROM password_reset_tokens
       WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()
       LIMIT 1`,
      [tokenHash],
    );
    const row = rows[0] as { id: number; user_id: number } | undefined;
    return row ?? null;
  },

  async markUsed(id: number): Promise<void> {
    await pool.query(`UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = ?`, [id]);
  },
};
