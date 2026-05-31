INSERT INTO permissions (code, name)
VALUES
  ('comments.view', 'View Comments'),
  ('comments.manage', 'Manage Comments'),
  ('notifications.view', 'View Notifications')
ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN')
  AND p.code IN ('comments.view', 'comments.manage');

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p
WHERE r.code = 'STAFF'
  AND p.code IN ('comments.view');
