import { pool } from '../configs/database.config';

export const publicRevisionService = {
  async getRevision(): Promise<number> {
    const [rows] = await pool.query(
      `SELECT revision FROM public_content_revision WHERE id = 1 LIMIT 1`,
    );
    const list = rows as Array<{ revision: number }>;
    return Number(list[0]?.revision ?? 1);
  },

  async bumpRevision(): Promise<number> {
    await pool.query(`UPDATE public_content_revision SET revision = revision + 1 WHERE id = 1`);
    return this.getRevision();
  },
};

/** Gọi sau khi admin thay đổi nội dung hiển thị shop (không chặn response). */
export const bumpPublicContentRevision = (): void => {
  void publicRevisionService.bumpRevision().catch((error) => {
    console.warn('[public-revision] bump failed:', error);
  });
};
