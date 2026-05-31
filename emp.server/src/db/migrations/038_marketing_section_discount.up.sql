SET @db = DATABASE();

SET @add_discount_percent = (
  SELECT IF(
    COUNT(*) = 0,
    'ALTER TABLE marketing_flash_sale_items ADD COLUMN discount_percent DECIMAL(5,2) NULL DEFAULT NULL AFTER badge_label',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND COLUMN_NAME = 'discount_percent'
);
PREPARE stmt_add_discount_percent FROM @add_discount_percent;
EXECUTE stmt_add_discount_percent;
DEALLOCATE PREPARE stmt_add_discount_percent;
