CREATE TABLE IF NOT EXISTS promotion_codes (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(80) NOT NULL,
  name VARCHAR(200) NOT NULL,
  description VARCHAR(500) NULL,
  discount_type ENUM('FIXED', 'PERCENT', 'FREE_SHIPPING') NOT NULL DEFAULT 'FIXED',
  discount_value DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  max_discount_amount DECIMAL(12, 2) NULL,
  min_order_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
  usage_limit INT UNSIGNED NULL,
  usage_limit_per_user INT UNSIGNED NULL DEFAULT 1,
  used_count INT UNSIGNED NOT NULL DEFAULT 0,
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_promotion_codes_code (code),
  KEY idx_promotion_codes_active (is_active, starts_at, ends_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS promotion_code_usages (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  promotion_code_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  used_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_promotion_usages_code_user (promotion_code_id, user_id),
  CONSTRAINT fk_promotion_usages_code
    FOREIGN KEY (promotion_code_id) REFERENCES promotion_codes(id) ON DELETE CASCADE,
  CONSTRAINT fk_promotion_usages_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_promotion_usages_order
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (code, name)
VALUES
  ('promotions.create', 'Create Promotions'),
  ('promotions.update', 'Update Promotions'),
  ('promotions.delete', 'Delete Promotions')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'SUPER_ADMIN';

INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p
WHERE r.code = 'ADMIN'
  AND p.code IN ('promotions.create', 'promotions.update', 'promotions.delete');

INSERT INTO promotion_codes (
  code,
  name,
  description,
  discount_type,
  discount_value,
  max_discount_amount,
  min_order_amount,
  usage_limit,
  usage_limit_per_user,
  is_active
)
VALUES
  (
    'GIAM15K',
    'Giảm 15.000đ',
    'Giảm 15.000đ cho đơn từ 99.000đ',
    'FIXED',
    15000,
    NULL,
    99000,
    NULL,
    1,
    1
  ),
  (
    'GIAM30K',
    'Giảm 30.000đ',
    'Giảm 30.000đ cho đơn từ 199.000đ',
    'FIXED',
    30000,
    NULL,
    199000,
    NULL,
    1,
    1
  ),
  (
    'FREESHIP',
    'Freeship',
    'Miễn phí vận chuyển cho đơn từ 99.000đ',
    'FREE_SHIPPING',
    0,
    NULL,
    99000,
    NULL,
    1,
    1
  )
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  updated_at = CURRENT_TIMESTAMP;
