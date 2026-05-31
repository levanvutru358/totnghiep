INSERT INTO permissions (code, name)
VALUES
  ('payments.view', 'View Payments'),
  ('payments.process', 'Process Payments'),
  ('payments.refund', 'Refund Payments')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('payments.view', 'payments.process', 'payments.refund')
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('payments.view', 'payments.process', 'payments.refund')
WHERE r.code = 'ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN ('payments.view', 'payments.process')
WHERE r.code = 'STAFF';
