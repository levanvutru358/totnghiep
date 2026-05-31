DROP TABLE IF EXISTS promotion_code_usages;
DROP TABLE IF EXISTS promotion_codes;

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE code IN ('promotions.create', 'promotions.update', 'promotions.delete')
);

DELETE FROM permissions
WHERE code IN ('promotions.create', 'promotions.update', 'promotions.delete');
