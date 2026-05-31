import { pool } from '../configs/database.config';

export const loginLogRepository = {
  async create(input: {
    userId: number;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
    isSuccess: boolean;
    failureReason?: string | null;
  }) {
    await pool.query(
      `INSERT INTO user_login_logs (user_id, ip_address, user_agent, device_label, is_success, failure_reason)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        input.userId,
        input.ipAddress ?? null,
        input.userAgent?.slice(0, 500) ?? null,
        input.deviceLabel ?? null,
        input.isSuccess ? 1 : 0,
        input.failureReason ?? null,
      ],
    );
  },

  async listByUser(userId: number, limit = 30) {
    const [rows] = await pool.query(
      `SELECT id, user_id, ip_address, user_agent, device_label, is_success, failure_reason, created_at
       FROM user_login_logs
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit],
    );
    return rows as any[];
  },
};
