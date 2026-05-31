CREATE TABLE IF NOT EXISTS shop_settings (
  id TINYINT UNSIGNED NOT NULL PRIMARY KEY DEFAULT 1,
  shop_name VARCHAR(150) NOT NULL DEFAULT 'DTT Shop',
  logo_url VARCHAR(500) NOT NULL DEFAULT '/logo-dtt.png',
  support_phone VARCHAR(30) NULL,
  support_email VARCHAR(150) NULL,
  default_shipping_fee DECIMAL(12, 2) NOT NULL DEFAULT 12.00,
  free_shipping_min_subtotal DECIMAL(12, 2) NOT NULL DEFAULT 200.00,
  payment_payos_enabled TINYINT(1) NOT NULL DEFAULT 1,
  payment_zalopay_enabled TINYINT(1) NOT NULL DEFAULT 1,
  default_payment_provider VARCHAR(20) NOT NULL DEFAULT 'PAYOS',
  return_policy_text TEXT NULL,
  shipping_policy_text TEXT NULL,
  chatbot_enabled TINYINT(1) NOT NULL DEFAULT 1,
  registration_enabled TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_shop_settings_singleton CHECK (id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO shop_settings (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = id;

INSERT INTO permissions (code, name)
VALUES ('settings.manage', 'Manage Shop Settings')
ON DUPLICATE KEY UPDATE name = VALUES(name), updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'settings.manage'
WHERE r.code IN ('SUPER_ADMIN', 'ADMIN');
