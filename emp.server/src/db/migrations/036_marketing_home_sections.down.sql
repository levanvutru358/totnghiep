DROP TABLE IF EXISTS marketing_home_sections;

ALTER TABLE marketing_flash_sale_items
  DROP INDEX uq_marketing_section_product;

ALTER TABLE marketing_flash_sale_items
  DROP INDEX idx_marketing_section_active;

ALTER TABLE marketing_flash_sale_items
  ADD UNIQUE KEY uq_marketing_flash_sale_product (product_id);

ALTER TABLE marketing_flash_sale_items
  DROP COLUMN section;
