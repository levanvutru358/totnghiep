import { pool } from '../configs/database.config';

export const notificationRepository = {
  async list(userId: number, page: number, limit: number) {
    const offset = (page - 1) * limit;
    const [rows] = await pool.query(
      `SELECT id, user_id, type, title, body, reference_type, reference_id, is_read, created_at
       FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [userId, limit, offset],
    );
    const [countRows] = await pool.query(`SELECT COUNT(*) AS total FROM notifications WHERE user_id = ?`, [userId]);
    const total = Number((countRows as any[])[0]?.total || 0);
    return { items: rows as any[], total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) };
  },

  async create(input: {
    userId: number;
    type: string;
    title: string;
    body?: string | null;
    referenceType?: string | null;
    referenceId?: number | null;
  }) {
    const [result] = await pool.query(
      `INSERT INTO notifications (user_id, type, title, body, reference_type, reference_id) VALUES (?, ?, ?, ?, ?, ?)`,
      [input.userId, input.type, input.title, input.body ?? null, input.referenceType ?? null, input.referenceId ?? null],
    );
    const [rows] = await pool.query(`SELECT * FROM notifications WHERE id = ?`, [(result as any).insertId]);
    return (rows as any[])[0];
  },

  async markRead(userId: number, notificationId: number) {
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`, [notificationId, userId]);
  },

  async markAllRead(userId: number) {
    await pool.query(`UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0`, [userId]);
  },

  async countUnread(userId: number) {
    const [rows] = await pool.query(
      `SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0`,
      [userId],
    );
    return Number((rows as any[])[0]?.unread || 0);
  },
};
