INSERT INTO permissions (code, name)
VALUES
  ('orders.create', 'Create Orders'),
  ('orders.update', 'Update Orders'),
  ('orders.cancel', 'Cancel Orders'),
  ('orders.manage_payments', 'Manage Order Payments'),
  ('orders.manage_returns', 'Manage Order Returns')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'orders.create',
  'orders.update',
  'orders.cancel',
  'orders.manage_payments',
  'orders.manage_returns'
)
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'orders.create',
  'orders.update',
  'orders.cancel',
  'orders.manage_payments',
  'orders.manage_returns'
)
WHERE r.code = 'ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code IN (
  'orders.update',
  'orders.cancel'
)
WHERE r.code = 'STAFF';
