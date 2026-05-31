import { pool } from '../configs/database.config';

export interface ProductColorImageRow {
  id: number;
  product_id: number;
  color_id: number;
  color_name: string;
  image_url: string;
  sort_order: number;
}

export const productColorImageRepository = {
  async listByProductId(productId: number): Promise<ProductColorImageRow[]> {
    const [rows] = await pool.query(
      `
      SELECT pci.id, pci.product_id, pci.color_id, c.name AS color_name,
             pci.image_url, pci.sort_order
      FROM product_color_images pci
      INNER JOIN colors c ON c.id = pci.color_id
      WHERE pci.product_id = ?
      ORDER BY pci.color_id ASC, pci.sort_order ASC, pci.id ASC
      `,
      [productId],
    );
    return rows as ProductColorImageRow[];
  },

  async replaceAll(
    productId: number,
    entries: Array<{ colorId: number; imageUrls: string[] }>,
  ): Promise<string[]> {
    const connection = await pool.getConnection();
    const allUrls: string[] = [];

    try {
      await connection.beginTransaction();
      await connection.query(`DELETE FROM product_color_images WHERE product_id = ?`, [productId]);

      for (const entry of entries) {
        const cleaned = entry.imageUrls.map((url) => url.trim()).filter(Boolean);
        for (let index = 0; index < cleaned.length; index += 1) {
          await connection.query(
            `
            INSERT INTO product_color_images (product_id, color_id, image_url, sort_order)
            VALUES (?, ?, ?, ?)
            `,
            [productId, entry.colorId, cleaned[index], index],
          );
          allUrls.push(cleaned[index]);
        }
      }

      await connection.commit();
      return allUrls;
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  },
};
