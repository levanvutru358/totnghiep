-- Ensure admin roles can create/update/delete products (idempotent)

INSERT INTO permissions (code, name)
VALUES
  ('products.create', 'Create Products'),
  ('products.update', 'Update Products'),
  ('products.delete', 'Delete Products')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('products.create', 'products.update', 'products.delete');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'STAFF'
  AND p.code IN ('products.update');
