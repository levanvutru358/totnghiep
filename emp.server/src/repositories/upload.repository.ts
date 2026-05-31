import { pool } from '../configs/database.config';

export const uploadRepository = {
  async create(input: {
    userId: number | null;
    url: string;
    publicId: string | null;
    mimeType?: string;
    fileSize?: number;
  }) {
    const [result] = await pool.query(
      `INSERT INTO uploaded_files (user_id, url, public_id, mime_type, file_size) VALUES (?, ?, ?, ?, ?)`,
      [input.userId, input.url, input.publicId, input.mimeType ?? null, input.fileSize ?? null],
    );
    const [rows] = await pool.query(`SELECT * FROM uploaded_files WHERE id = ?`, [(result as any).insertId]);
    return (rows as any[])[0];
  },

  async getById(id: number) {
    const [rows] = await pool.query(`SELECT * FROM uploaded_files WHERE id = ?`, [id]);
    return (rows as any[])[0] || null;
  },

  async remove(id: number) {
    await pool.query(`DELETE FROM uploaded_files WHERE id = ?`, [id]);
  },
};
