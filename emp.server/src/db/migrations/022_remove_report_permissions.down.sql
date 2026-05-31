INSERT INTO permissions (code, description)
VALUES
  ('reports.view', 'View Reports'),
  ('reports.manage', 'Manage Reports')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('reports.view', 'reports.manage')
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'reports.view'
WHERE r.code IN ('ADMIN', 'STAFF');
