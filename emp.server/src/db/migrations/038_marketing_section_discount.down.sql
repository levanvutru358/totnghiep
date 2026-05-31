SET @db = DATABASE();

SET @drop_discount_percent = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE marketing_flash_sale_items DROP COLUMN discount_percent',
    'SELECT 1'
  )
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = @db
    AND TABLE_NAME = 'marketing_flash_sale_items'
    AND COLUMN_NAME = 'discount_percent'
);
PREPARE stmt_drop_discount_percent FROM @drop_discount_percent;
EXECUTE stmt_drop_discount_percent;
DEALLOCATE PREPARE stmt_drop_discount_percent;
