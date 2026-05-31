CREATE TABLE IF NOT EXISTS marketing_banners (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  placement VARCHAR(40) NOT NULL DEFAULT 'HOME_HERO',
  title VARCHAR(300) NOT NULL,
  description VARCHAR(1000) NULL,
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500) NOT NULL DEFAULT '/categories',
  cta_label VARCHAR(120) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  starts_at TIMESTAMP NULL,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_marketing_banners_active (placement, is_active, sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS marketing_flash_sale_items (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  badge_label VARCHAR(80) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  ends_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_marketing_flash_sale_product (product_id),
  KEY idx_marketing_flash_sale_active (is_active, sort_order),
  CONSTRAINT fk_marketing_flash_sale_product
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO permissions (code, name)
VALUES
  ('marketing.create', 'Create Marketing'),
  ('marketing.update', 'Update Marketing'),
  ('marketing.delete', 'Delete Marketing')
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
  AND p.code IN ('marketing.create', 'marketing.update', 'marketing.delete');

INSERT INTO marketing_banners (
  placement,
  title,
  description,
  image_url,
  link_url,
  cta_label,
  sort_order,
  is_active
)
VALUES
  (
    'HOME_HERO',
    'Flash Sale mỗi ngày – Săn deal sốc, chốt đơn siêu nhanh',
    'Giảm sâu theo khung giờ, số lượng giới hạn. Ưu đãi nổi bật cho giày chạy bộ, sneaker, sandal.',
    'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600',
    '/categories',
    'Săn Flash Sale ngay',
    1,
    1
  ),
  (
    'HOME_HERO',
    'Top Deal hôm nay – Giá tốt mỗi ngày, chất lượng đảm bảo',
    'Chọn lọc sản phẩm bán chạy và được yêu thích. So sánh nhanh, mua sắm an tâm.',
    'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=1600',
    '/categories',
    'Xem Top Deal',
    2,
    1
  ),
  (
    'HOME_HERO',
    'Hàng mới về – Cập nhật xu hướng, lựa chọn đa dạng',
    'Khám phá sản phẩm mới: giày chạy bộ, sneaker, giày bóng rổ, sandal.',
    'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1600',
    '/categories',
    'Khám phá hàng mới',
    3,
    1
  );
