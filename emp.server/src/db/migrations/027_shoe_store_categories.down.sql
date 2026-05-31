UPDATE categories
SET is_active = 1, updated_at = CURRENT_TIMESTAMP
WHERE slug IN ('shoes', 'apparel', 'accessories', 'electronics', 'beauty');

UPDATE products p
INNER JOIN categories c ON c.id = p.category_id
SET p.is_active = 1, p.updated_at = CURRENT_TIMESTAMP
WHERE c.slug IN ('shoes', 'apparel', 'accessories', 'electronics', 'beauty');

UPDATE categories
SET is_active = 0, updated_at = CURRENT_TIMESTAMP
WHERE slug IN (
  'running',
  'lifestyle',
  'basketball',
  'training',
  'sandals',
  'boots',
  'outdoor',
  'shoe-accessories'
);
