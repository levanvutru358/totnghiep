SET @db = DATABASE();

SET @add_section = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD COLUMN section VARCHAR(40) NOT NULL DEFAULT ''FLASH_SALE'' AFTER id',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND COLUMN_NAME = 'section'
);
PREPARE stmt_add_section FROM @add_section;
EXECUTE stmt_add_section;
DEALLOCATE PREPARE stmt_add_section;

SET @drop_fk = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE marketing_flash_sale_items DROP FOREIGN KEY fk_marketing_flash_sale_product',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND CONSTRAINT_NAME = 'fk_marketing_flash_sale_product'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt_drop_fk FROM @drop_fk;
EXECUTE stmt_drop_fk;
DEALLOCATE PREPARE stmt_drop_fk;

SET @drop_old_uq = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE marketing_flash_sale_items DROP INDEX uq_marketing_flash_sale_product',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND INDEX_NAME = 'uq_marketing_flash_sale_product'
);
PREPARE stmt_drop_old_uq FROM @drop_old_uq;
EXECUTE stmt_drop_old_uq;
DEALLOCATE PREPARE stmt_drop_old_uq;

SET @add_section_uq = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD UNIQUE KEY uq_marketing_section_product (section, product_id)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND INDEX_NAME = 'uq_marketing_section_product'
);
PREPARE stmt_add_section_uq FROM @add_section_uq;
EXECUTE stmt_add_section_uq;
DEALLOCATE PREPARE stmt_add_section_uq;

SET @add_product_idx = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD KEY idx_marketing_flash_sale_product (product_id)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND INDEX_NAME = 'idx_marketing_flash_sale_product'
);
PREPARE stmt_add_product_idx FROM @add_product_idx;
EXECUTE stmt_add_product_idx;
DEALLOCATE PREPARE stmt_add_product_idx;

SET @add_fk = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD CONSTRAINT fk_marketing_flash_sale_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND CONSTRAINT_NAME = 'fk_marketing_flash_sale_product'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt_add_fk FROM @add_fk;
EXECUTE stmt_add_fk;
DEALLOCATE PREPARE stmt_add_fk;

SET @add_section_idx = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD KEY idx_marketing_section_active (section, is_active, sort_order)',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.STATISTICS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND INDEX_NAME = 'idx_marketing_section_active'
);
PREPARE stmt_add_section_idx FROM @add_section_idx;
EXECUTE stmt_add_section_idx;
DEALLOCATE PREPARE stmt_add_section_idx;

CREATE TABLE IF NOT EXISTS marketing_home_sections (
  code VARCHAR(40) PRIMARY KEY,
  title VARCHAR(120) NOT NULL,
  subtitle VARCHAR(300) NULL,
  badge_label VARCHAR(80) NULL,
  link_url VARCHAR(500) NULL DEFAULT '/categories',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  sort_order INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO marketing_home_sections (code, title, subtitle, badge_label, link_url, sort_order, is_active)
VALUES
  ('TOP_DEAL', 'Top Deal', 'Ưu đãi giảm giá nổi bật', 'SIÊU RẺ', '/categories', 1, 1),
  ('FLASH_SALE', 'Flash Sale', 'Săn deal sốc trong khung giờ', NULL, '/categories', 2, 1),
  ('BEST_SELLER', 'Top bán chạy', 'Theo danh mục phổ biến', NULL, '/categories', 3, 1),
  ('SUGGESTED', 'Gợi ý hôm nay', 'Hàng chọn lọc theo sở thích', NULL, '/categories', 4, 1)
ON DUPLICATE KEY UPDATE
  title = VALUES(title),
  subtitle = VALUES(subtitle),
  badge_label = VALUES(badge_label),
  link_url = VALUES(link_url),
  sort_order = VALUES(sort_order);
