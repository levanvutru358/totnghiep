import { pool } from '../configs/database.config';

export interface ProductImageRow {
  id: number;
  product_id: number;
  image_url: string;
  sort_order: number;
}

export const productImageRepository = {
  async listByProductId(productId: number): Promise<ProductImageRow[]> {
    const [rows] = await pool.query(
      `
      SELECT id, product_id, image_url, sort_order
      FROM product_images
      WHERE product_id = ?
      ORDER BY sort_order ASC, id ASC
      `,
      [productId],
    );
    return rows as ProductImageRow[];
  },

  async listUrlsByProductIds(productIds: number[]): Promise<Map<number, string[]>> {
    const map = new Map<number, string[]>();
    if (productIds.length === 0) return map;

    const [rows] = await pool.query(
      `
      SELECT product_id, image_url, sort_order
      FROM product_images
      WHERE product_id IN (?)
      ORDER BY product_id ASC, sort_order ASC, id ASC
      `,
      [productIds],
    );

    for (const row of rows as Array<{ product_id: number; image_url: string }>) {
      const list = map.get(row.product_id) ?? [];
      list.push(row.image_url);
      map.set(row.product_id, list);
    }
    return map;
  },

  async replaceAll(productId: number, imageUrls: string[]) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(`DELETE FROM product_images WHERE product_id = ?`, [productId]);

      const cleaned = imageUrls.map((url) => url.trim()).filter(Boolean);
      for (let index = 0; index < cleaned.length; index += 1) {
        await connection.query(
          `
          INSERT INTO product_images (product_id, image_url, sort_order)
          VALUES (?, ?, ?)
          `,
          [productId, cleaned[index], index],
        );
      }

      await connection.commit();
      return cleaned;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
