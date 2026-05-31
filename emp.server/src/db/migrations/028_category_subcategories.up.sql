-- Danh mục 2 cấp: nhóm giày (cha) + loại con (theo mega menu trang chủ)
ALTER TABLE categories
  ADD COLUMN parent_id BIGINT UNSIGNED NULL AFTER id,
  ADD INDEX idx_categories_parent (parent_id);

ALTER TABLE categories
  ADD CONSTRAINT fk_categories_parent
  FOREIGN KEY (parent_id) REFERENCES categories(id)
  ON DELETE SET NULL;

-- Đảm bảo 8 danh mục cha đang active
UPDATE categories
SET parent_id = NULL, is_active = 1, updated_at = CURRENT_TIMESTAMP
WHERE slug IN (
  'running', 'lifestyle', 'basketball', 'training',
  'sandals', 'boots', 'outdoor', 'shoe-accessories'
);

-- Giày chạy bộ
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Road running' AS name, 'running-road-running' AS slug, 'Giày chạy đường phố' AS description UNION ALL
  SELECT 'Trail / off-road', 'running-trail-off-road', 'Giày trail, off-road' UNION ALL
  SELECT 'Daily trainer', 'running-daily-trainer', 'Giày tập hằng ngày' UNION ALL
  SELECT 'Tốc độ – tempo', 'running-toc-do-tempo', 'Giày tốc độ, tempo' UNION ALL
  SELECT 'Ổn định gót', 'running-on-dinh-got', 'Giày hỗ trợ ổn định gót'
) v
WHERE p.slug = 'running'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Sneaker & lifestyle
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Retro' AS name, 'lifestyle-retro' AS slug, 'Sneaker retro' AS description UNION ALL
  SELECT 'Canvas', 'lifestyle-canvas', 'Giày canvas' UNION ALL
  SELECT 'Slip-on', 'lifestyle-slip-on', 'Giày slip-on' UNION ALL
  SELECT 'Chunky', 'lifestyle-chunky', 'Giày chunky' UNION ALL
  SELECT 'Phối đồ street', 'lifestyle-phoi-do-street', 'Sneaker phối đồ street'
) v
WHERE p.slug = 'lifestyle'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Giày bóng rổ
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Low-top' AS name, 'basketball-low-top' AS slug, 'Giày bóng rổ cổ thấp' AS description UNION ALL
  SELECT 'Mid-top', 'basketball-mid-top', 'Giày bóng rổ cổ trung' UNION ALL
  SELECT 'High-top', 'basketball-high-top', 'Giày bóng rổ cổ cao' UNION ALL
  SELECT 'Outdoor court', 'basketball-outdoor-court', 'Sân ngoài trời' UNION ALL
  SELECT 'Indoor parquet', 'basketball-indoor-parquet', 'Sân parquet trong nhà'
) v
WHERE p.slug = 'basketball'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Giày training – gym
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'HIIT' AS name, 'training-hiit' AS slug, 'Giày tập HIIT' AS description UNION ALL
  SELECT 'Nâng tạ', 'training-nang-ta', 'Giày nâng tạ' UNION ALL
  SELECT 'Cross-training', 'training-cross-training', 'Giày cross-training' UNION ALL
  SELECT 'Aerobic', 'training-aerobic', 'Giày aerobic' UNION ALL
  SELECT 'Studio', 'training-studio', 'Giày tập studio'
) v
WHERE p.slug = 'training'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Sandal & dép
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Dép quai ngang' AS name, 'sandals-dep-quai-ngang' AS slug, 'Dép quai ngang' AS description UNION ALL
  SELECT 'Sandal trekking', 'sandals-trekking', 'Sandal trekking' UNION ALL
  SELECT 'Dép EVA', 'sandals-dep-eva', 'Dép EVA' UNION ALL
  SELECT 'Sandal học sinh', 'sandals-hoc-sinh', 'Sandal học sinh' UNION ALL
  SELECT 'Dép đi trong nhà', 'sandals-dep-trong-nha', 'Dép đi trong nhà'
) v
WHERE p.slug = 'sandals'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Boots – cổ cao
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Chelsea' AS name, 'boots-chelsea' AS slug, 'Giày Chelsea' AS description UNION ALL
  SELECT 'Combat', 'boots-combat', 'Giày combat' UNION ALL
  SELECT 'Cổ lửng', 'boots-co-lung', 'Giày cổ lửng' UNION ALL
  SELECT 'Mùa đông', 'boots-mua-dong', 'Giày mùa đông' UNION ALL
  SELECT 'Da / suede', 'boots-da-suede', 'Giày da / suede'
) v
WHERE p.slug = 'boots'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Giày leo núi – outdoor
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Đế gai' AS name, 'outdoor-de-gai' AS slug, 'Đế gai' AS description UNION ALL
  SELECT 'Chống trượt', 'outdoor-chong-truot', 'Chống trượt' UNION ALL
  SELECT 'Chống nước', 'outdoor-chong-nuoc', 'Chống nước' UNION ALL
  SELECT 'Leo nhẹ', 'outdoor-leo-nhe', 'Leo nhẹ' UNION ALL
  SELECT 'Đa địa hình', 'outdoor-da-dia-hinh', 'Đa địa hình'
) v
WHERE p.slug = 'outdoor'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Phụ kiện giày dép
INSERT INTO categories (parent_id, name, slug, description, is_active)
SELECT p.id, v.name, v.slug, v.description, 1
FROM categories p
JOIN (
  SELECT 'Vớ thể thao' AS name, 'shoe-accessories-vo-the-thao' AS slug, 'Vớ thể thao' AS description UNION ALL
  SELECT 'Dây giày', 'shoe-accessories-day-giay', 'Dây giày' UNION ALL
  SELECT 'Đế lót', 'shoe-accessories-de-lot', 'Đế lót' UNION ALL
  SELECT 'Chai vệ sinh', 'shoe-accessories-chai-ve-sinh', 'Chai vệ sinh giày' UNION ALL
  SELECT 'Hộp đựng giày', 'shoe-accessories-hop-dung-giay', 'Hộp đựng giày'
) v
WHERE p.slug = 'shoe-accessories'
ON DUPLICATE KEY UPDATE
  parent_id = VALUES(parent_id),
  name = VALUES(name),
  description = VALUES(description),
  is_active = 1,
  updated_at = CURRENT_TIMESTAMP;

-- Sản phẩm đang gắn danh mục cha → chuyển sang danh mục con đầu tiên
UPDATE products p
INNER JOIN categories parent ON parent.id = p.category_id AND parent.parent_id IS NULL
INNER JOIN (
  SELECT parent_id, MIN(id) AS first_child_id
  FROM categories
  WHERE parent_id IS NOT NULL AND is_active = 1
  GROUP BY parent_id
) fc ON fc.parent_id = parent.id
SET p.category_id = fc.first_child_id,
    p.updated_at = CURRENT_TIMESTAMP;
