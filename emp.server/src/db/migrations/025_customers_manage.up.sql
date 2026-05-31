INSERT INTO permissions (code, name)
VALUES ('customers.manage', 'Manage Customers')
ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'customers.manage'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN');
