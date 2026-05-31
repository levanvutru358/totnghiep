-- Add CRUD permissions for admin operations

INSERT INTO permissions (code, name)
VALUES
  ('products.create', 'Create Products'),
  ('products.update', 'Update Products'),
  ('products.delete', 'Delete Products'),
  ('categories.create', 'Create Categories & Brands'),
  ('categories.update', 'Update Categories & Brands'),
  ('categories.delete', 'Delete Categories & Brands'),
  ('inventory.adjust', 'Adjust Inventory')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

-- SUPER_ADMIN: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

-- ADMIN: full CRUD for products/categories + inventory adjust
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN (
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'inventory.adjust'
  );

-- STAFF: allow update products and adjust inventory, no delete
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'STAFF'
  AND p.code IN (
    'products.update',
    'inventory.adjust'
  );
