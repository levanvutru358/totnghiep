DELETE rp
FROM role_permissions rp
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE p.code IN ('reports.view', 'reports.manage');

DELETE FROM permissions WHERE code IN ('reports.view', 'reports.manage');
