-- Product reviews: 1-5 stars + comment per product per user

CREATE TABLE IF NOT EXISTS product_reviews (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  product_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  order_id BIGINT UNSIGNED NULL,
  rating TINYINT UNSIGNED NOT NULL,
  comment TEXT NOT NULL,
  status ENUM('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN') NOT NULL DEFAULT 'PENDING',
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  admin_note VARCHAR(500) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_product_reviews_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL,
  CONSTRAINT chk_product_reviews_rating CHECK (rating >= 1 AND rating <= 5),
  UNIQUE KEY uq_product_reviews_user_product (user_id, product_id),
  INDEX idx_product_reviews_product (product_id),
  INDEX idx_product_reviews_user (user_id),
  INDEX idx_product_reviews_status (status),
  INDEX idx_product_reviews_rating (rating),
  INDEX idx_product_reviews_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
