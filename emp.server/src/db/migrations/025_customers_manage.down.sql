DELETE rp
FROM role_permissions rp
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE p.code = 'customers.manage';

DELETE FROM permissions WHERE code = 'customers.manage';
