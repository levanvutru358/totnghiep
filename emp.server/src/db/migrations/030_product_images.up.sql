CREATE TABLE IF NOT EXISTS product_images (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  product_id BIGINT UNSIGNED NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product_sort (product_id, sort_order)
);

-- Đồng bộ ảnh hiện có từ thumbnail_url
INSERT INTO product_images (product_id, image_url, sort_order)
SELECT p.id, p.thumbnail_url, 0
FROM products p
WHERE p.thumbnail_url IS NOT NULL
  AND TRIM(p.thumbnail_url) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM product_images pi WHERE pi.product_id = p.id LIMIT 1
  );
