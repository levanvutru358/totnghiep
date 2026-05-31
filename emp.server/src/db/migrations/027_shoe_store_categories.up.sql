-- Cấu hình danh mục cho cửa hàng bán giày (tiếng Việt)
INSERT INTO categories (name, slug, description, is_active)
VALUES
  ('Giày chạy bộ', 'running', 'Giày chạy đường phố, trail, daily trainer', 1),
  ('Sneaker & lifestyle', 'lifestyle', 'Giày sneaker, phối đồ street', 1),
  ('Giày bóng rổ', 'basketball', 'Giày bóng rổ indoor/outdoor', 1),
  ('Giày training – gym', 'training', 'Giày tập gym, HIIT, cross-training', 1),
  ('Sandal & dép', 'sandals', 'Dép quai ngang, sandal trekking', 1),
  ('Boots – cổ cao', 'boots', 'Chelsea, combat, cổ lửng', 1),
  ('Giày leo núi – outdoor', 'outdoor', 'Giày trekking, đa địa hình', 1),
  ('Phụ kiện giày dép', 'shoe-accessories', 'Vớ thể thao, dây giày, đế lót', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Gán lại sản phẩm giày seed sang danh mục phù hợp
UPDATE products p
INNER JOIN categories c ON c.id = p.category_id
SET p.category_id = (SELECT id FROM categories WHERE slug = 'running' LIMIT 1)
WHERE p.slug = 'runner-nova';

UPDATE products p
SET p.category_id = (SELECT id FROM categories WHERE slug = 'lifestyle' LIMIT 1)
WHERE p.slug = 'court-flex';

UPDATE products p
SET p.category_id = (SELECT id FROM categories WHERE slug = 'basketball' LIMIT 1)
WHERE p.slug = 'hoops-max';

-- Sản phẩm còn ở danh mục "shoes" cũ → lifestyle
UPDATE products p
INNER JOIN categories old_c ON old_c.id = p.category_id AND old_c.slug = 'shoes'
SET p.category_id = (SELECT id FROM categories WHERE slug = 'lifestyle' LIMIT 1);

-- Ẩn danh mục không phải giày
UPDATE categories
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('shoes', 'apparel', 'accessories', 'electronics', 'beauty');

-- Ẩn sản phẩm thuộc danh mục đã tắt
UPDATE products p
INNER JOIN categories c ON c.id = p.category_id
SET p.is_active = 0, p.updated_at = CURRENT_TIMESTAMP
WHERE c.is_active = 0;
