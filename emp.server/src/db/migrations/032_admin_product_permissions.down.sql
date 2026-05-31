DELETE rp
FROM role_permissions rp
INNER JOIN roles r ON r.id = rp.role_id
INNER JOIN permissions p ON p.id = rp.permission_id
WHERE r.code IN ('ADMIN', 'STAFF')
  AND p.code IN ('products.create', 'products.update', 'products.delete');
