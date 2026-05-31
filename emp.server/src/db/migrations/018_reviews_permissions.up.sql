INSERT INTO permissions (code, name)
VALUES
  ('reviews.create', 'Create Product Reviews'),
  ('reviews.update', 'Update Own Reviews'),
  ('reviews.delete', 'Delete Own Reviews'),
  ('reviews.manage', 'Moderate Product Reviews')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SUPER_ADMIN'
  AND p.code IN ('reviews.create', 'reviews.update', 'reviews.delete', 'reviews.manage');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('reviews.create', 'reviews.update', 'reviews.delete', 'reviews.manage');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'STAFF'
  AND p.code IN ('reviews.view', 'reviews.manage');
