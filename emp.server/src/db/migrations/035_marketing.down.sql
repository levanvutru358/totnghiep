DROP TABLE IF EXISTS marketing_flash_sale_items;
DROP TABLE IF EXISTS marketing_banners;

DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE code IN ('marketing.create', 'marketing.update', 'marketing.delete')
);

DELETE FROM permissions
WHERE code IN ('marketing.create', 'marketing.update', 'marketing.delete');
