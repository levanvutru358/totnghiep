-- Add permission model (without user_permissions): permissions + role_permissions

CREATE TABLE IF NOT EXISTS permissions (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(120) NOT NULL,
  name VARCHAR(150) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_permissions_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id BIGINT UNSIGNED NOT NULL,
  permission_id BIGINT UNSIGNED NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (code, name)
VALUES
  ('dashboard.view', 'View Dashboard'),
  ('products.view', 'View Products'),
  ('orders.view', 'View Orders'),
  ('customers.view', 'View Customers'),
  ('categories.view', 'View Categories & Brands'),
  ('inventory.view', 'View Inventory'),
  ('marketing.view', 'View Marketing'),
  ('promotions.view', 'View Promotions'),
  ('reviews.view', 'View Reviews'),
  ('settings.view', 'View Settings'),
  ('permissions.manage', 'Manage Role Permissions')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

-- SUPER_ADMIN: all permissions
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

-- ADMIN: all pages except permissions.manage
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN (
    'dashboard.view',
    'products.view',
    'orders.view',
    'customers.view',
    'categories.view',
    'inventory.view',
    'marketing.view',
    'promotions.view',
    'reviews.view',
    'settings.view'
  );

-- STAFF: restricted operation pages
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'STAFF'
  AND p.code IN (
    'dashboard.view',
    'products.view',
    'orders.view',
    'customers.view',
    'categories.view',
    'inventory.view',
    'reviews.view'
  );
