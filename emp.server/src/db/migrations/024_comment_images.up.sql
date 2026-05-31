CREATE TABLE IF NOT EXISTS comment_images (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  comment_id BIGINT UNSIGNED NOT NULL,
  upload_id BIGINT UNSIGNED NULL,
  image_url VARCHAR(500) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_comment_images_comment FOREIGN KEY (comment_id) REFERENCES product_comments(id) ON DELETE CASCADE,
  CONSTRAINT fk_comment_images_upload FOREIGN KEY (upload_id) REFERENCES uploaded_files(id) ON DELETE SET NULL,
  INDEX idx_comment_images_comment (comment_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
