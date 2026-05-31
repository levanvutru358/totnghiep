-- Seed dev data for Product + Inventory core schema (001_product_inventory_core.up.sql)
-- Note: `runMigrations()` already wraps each migration in a transaction.

-- 1) Categories
INSERT INTO categories (name, slug, description, is_active)
VALUES
  ('Shoes', 'shoes', 'Footwear for daily & sport use', 1),
  ('Apparel', 'apparel', 'Clothing and apparel items', 1),
  ('Accessories', 'accessories', 'Bags, hats, and accessories', 1),
  ('Electronics', 'electronics', 'Small consumer electronics', 1),
  ('Beauty', 'beauty', 'Beauty & personal care', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- 2) Brands
INSERT INTO brands (name, slug, description, is_active)
VALUES
  ('Nike', 'nike', 'Sportswear brand', 1),
  ('Adidas', 'adidas', 'Sportswear brand', 1),
  ('Puma', 'puma', 'Sportswear brand', 1),
  ('Uniqlo', 'uniqlo', 'Everyday apparel brand', 1),
  ('Apple', 'apple', 'Consumer electronics brand', 1)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- 3) Sizes
INSERT INTO sizes (label, sort_order, is_active)
VALUES
  ('S', 10, 1),
  ('M', 20, 1),
  ('L', 30, 1),
  ('39', 39, 1),
  ('40', 40, 1),
  ('41', 41, 1),
  ('42', 42, 1),
  ('43', 43, 1)
ON DUPLICATE KEY UPDATE
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- 4) Colors
INSERT INTO colors (name, hex_code, sort_order, is_active)
VALUES
  ('Black', '#111827', 10, 1),
  ('White', '#F9FAFB', 20, 1),
  ('Red', '#EF4444', 30, 1),
  ('Green', '#22C55E', 40, 1),
  ('Cream', '#F5F5DC', 50, 1)
ON DUPLICATE KEY UPDATE
  hex_code = VALUES(hex_code),
  sort_order = VALUES(sort_order),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- 5) Products
INSERT INTO products (
  category_id, brand_id, name, slug, short_description, description,
  base_price, sale_price, thumbnail_url, is_active, is_featured
)
SELECT
  c.id,
  b.id,
  src.name,
  src.slug,
  src.short_description,
  src.description,
  src.base_price,
  src.sale_price,
  src.thumbnail_url,
  1,
  src.is_featured
FROM (
  SELECT
    'Runner Nova' AS name,
    'runner-nova' AS slug,
    'Comfort-focused running shoe for daily training.' AS short_description,
    'Comfort-focused running shoe for daily training.' AS description,
    129.00 AS base_price,
    NULL AS sale_price,
    'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800' AS thumbnail_url,
    1 AS is_featured,
    'shoes' AS category_slug,
    'nike' AS brand_slug
  UNION ALL
  SELECT
    'Court Flex',
    'court-flex',
    'Lifestyle court sneaker with premium leather upper.',
    'Lifestyle court sneaker with premium leather upper.',
    145.00,
    NULL,
    'https://images.unsplash.com/photo-1518002171953-a080ee817e1f?w=800',
    0,
    'shoes',
    'adidas'
  UNION ALL
  SELECT
    'Hoops Max',
    'hoops-max',
    'Stable mid-top basketball shoe with responsive cushioning.',
    'Stable mid-top basketball shoe with responsive cushioning.',
    159.00,
    139.00,
    'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=800',
    0,
    'shoes',
    'puma'
  UNION ALL
  SELECT
    'Cotton Street Tee',
    'cotton-street-tee',
    'Soft cotton tee for everyday wear.',
    'Soft cotton tee for everyday wear.',
    19.90,
    NULL,
    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800',
    0,
    'apparel',
    'uniqlo'
  UNION ALL
  SELECT
    'Urban Backpack',
    'urban-backpack',
    'City-ready backpack with padded laptop sleeve.',
    'City-ready backpack with padded laptop sleeve.',
    69.00,
    NULL,
    'https://images.unsplash.com/photo-1526481280695-3c687fd5432c?w=800',
    0,
    'accessories',
    'nike'
  UNION ALL
  SELECT
    'Mini Wireless Earbuds',
    'mini-wireless-earbuds',
    'Compact earbuds with charging case.',
    'Compact earbuds with charging case.',
    99.00,
    89.00,
    'https://images.unsplash.com/photo-1585386959984-a41552231693?w=800',
    0,
    'electronics',
    'apple'
) AS src
INNER JOIN categories c ON c.slug = src.category_slug
INNER JOIN brands b ON b.slug = src.brand_slug
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  brand_id = VALUES(brand_id),
  name = VALUES(name),
  short_description = VALUES(short_description),
  description = VALUES(description),
  base_price = VALUES(base_price),
  sale_price = VALUES(sale_price),
  thumbnail_url = VALUES(thumbnail_url),
  is_active = VALUES(is_active),
  is_featured = VALUES(is_featured),
  updated_at = CURRENT_TIMESTAMP;

-- 6) Variants (SKU must be unique)
INSERT INTO product_variants (
  product_id, size_id, color_id, sku, barcode, price,
  stock_quantity, min_stock_threshold, is_active
)
SELECT
  p.id,
  s.id,
  co.id,
  src.sku,
  NULL,
  NULL,
  src.stock_quantity,
  src.min_stock_threshold,
  1
FROM (
  SELECT 'runner-nova' AS product_slug, '40' AS size_label, 'Black' AS color_name, 'RN-BLK-40' AS sku, 9 AS stock_quantity, 5 AS min_stock_threshold
  UNION ALL
  SELECT 'runner-nova', '41', 'Black', 'RN-BLK-41', 0, 5
  UNION ALL
  SELECT 'runner-nova', '42', 'White', 'RN-WHT-42', 7, 5
  UNION ALL
  SELECT 'court-flex', '39', 'Cream', 'CF-CRM-39', 5, 5
  UNION ALL
  SELECT 'court-flex', '40', 'Green', 'CF-GRN-40', 8, 5
  UNION ALL
  SELECT 'hoops-max', '41', 'Red', 'HM-RED-41', 4, 5
  UNION ALL
  SELECT 'hoops-max', '42', 'Red', 'HM-RED-42', 2, 5
  UNION ALL
  SELECT 'hoops-max', '43', 'Black', 'HM-BLK-43', 0, 5
  UNION ALL
  SELECT 'cotton-street-tee', 'S', 'White', 'TEE-WHT-S', 12, 8
  UNION ALL
  SELECT 'cotton-street-tee', 'M', 'White', 'TEE-WHT-M', 8, 8
  UNION ALL
  SELECT 'cotton-street-tee', 'L', 'Black', 'TEE-BLK-L', 3, 8
  UNION ALL
  SELECT 'urban-backpack', 'M', 'Black', 'BAG-BLK-M', 6, 4
  UNION ALL
  SELECT 'mini-wireless-earbuds', 'M', 'White', 'EAR-WHT-STD', 15, 10
) AS src
INNER JOIN products p ON p.slug = src.product_slug
INNER JOIN sizes s ON s.label = src.size_label
INNER JOIN colors co ON co.name = src.color_name
ON DUPLICATE KEY UPDATE
  product_id = VALUES(product_id),
  size_id = VALUES(size_id),
  color_id = VALUES(color_id),
  stock_quantity = VALUES(stock_quantity),
  min_stock_threshold = VALUES(min_stock_threshold),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;

-- 7) Inventory transactions (guard by NOT EXISTS on reference_code)
INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'IN', 20, 'Seed restock', 'SEED-IN-0001', 'seed', DATE_SUB(NOW(), INTERVAL 10 DAY)
FROM product_variants pv
WHERE pv.sku = 'RN-BLK-40'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-IN-0001' AND it.variant_id = pv.id AND it.transaction_type = 'IN'
  );

INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'IN', 10, 'Seed restock', 'SEED-IN-0002', 'seed', DATE_SUB(NOW(), INTERVAL 9 DAY)
FROM product_variants pv
WHERE pv.sku = 'TEE-WHT-S'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-IN-0002' AND it.variant_id = pv.id AND it.transaction_type = 'IN'
  );

INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'OUT', 2, 'Seed order', 'SEED-ORD-0001', 'Linh Nguyen', DATE_SUB(NOW(), INTERVAL 6 DAY)
FROM product_variants pv
WHERE pv.sku = 'RN-BLK-40'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-ORD-0001' AND it.variant_id = pv.id AND it.transaction_type = 'OUT'
  );

INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'OUT', 1, 'Seed order', 'SEED-ORD-0002', 'Ha Tran', DATE_SUB(NOW(), INTERVAL 4 DAY)
FROM product_variants pv
WHERE pv.sku = 'CF-GRN-40'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-ORD-0002' AND it.variant_id = pv.id AND it.transaction_type = 'OUT'
  );

INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'OUT', 3, 'Seed order', 'SEED-ORD-0003', 'Bao Pham', DATE_SUB(NOW(), INTERVAL 2 DAY)
FROM product_variants pv
WHERE pv.sku = 'EAR-WHT-STD'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-ORD-0003' AND it.variant_id = pv.id AND it.transaction_type = 'OUT'
  );

INSERT INTO inventory_transactions (variant_id, transaction_type, quantity, note, reference_code, created_by, created_at)
SELECT pv.id, 'ADJUSTMENT', 5, 'Seed adjustment', 'SEED-ADJ-0001', 'seed', DATE_SUB(NOW(), INTERVAL 1 DAY)
FROM product_variants pv
WHERE pv.sku = 'HM-RED-41'
  AND NOT EXISTS (
    SELECT 1 FROM inventory_transactions it
    WHERE it.reference_code = 'SEED-ADJ-0001' AND it.variant_id = pv.id AND it.transaction_type = 'ADJUSTMENT'
  );

-- 8) Product relations
INSERT IGNORE INTO product_relations (product_id, related_product_id, relation_type, sort_order)
SELECT p1.id, p2.id, 'RELATED', 10
FROM products p1
INNER JOIN products p2
WHERE p1.slug = 'runner-nova' AND p2.slug = 'court-flex';

INSERT IGNORE INTO product_relations (product_id, related_product_id, relation_type, sort_order)
SELECT p1.id, p2.id, 'RELATED', 20
FROM products p1
INNER JOIN products p2
WHERE p1.slug = 'runner-nova' AND p2.slug = 'hoops-max';

