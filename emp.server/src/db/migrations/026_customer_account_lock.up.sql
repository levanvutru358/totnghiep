ALTER TABLE users
  ADD COLUMN account_status ENUM('ACTIVE', 'LOCKED', 'TEMP_LOCKED') NOT NULL DEFAULT 'ACTIVE' AFTER is_active,
  ADD COLUMN lock_reason VARCHAR(500) NULL AFTER account_status,
  ADD COLUMN locked_until TIMESTAMP NULL AFTER lock_reason,
  ADD COLUMN locked_at TIMESTAMP NULL AFTER locked_until,
  ADD COLUMN locked_by BIGINT UNSIGNED NULL AFTER locked_at,
  ADD INDEX idx_users_account_status (account_status),
  ADD CONSTRAINT fk_users_locked_by FOREIGN KEY (locked_by) REFERENCES users(id) ON DELETE SET NULL;

UPDATE users SET account_status = IF(is_active = 0, 'LOCKED', 'ACTIVE');

CREATE TABLE IF NOT EXISTS user_login_logs (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  ip_address VARCHAR(45) NULL,
  user_agent VARCHAR(500) NULL,
  device_label VARCHAR(120) NULL,
  is_success TINYINT(1) NOT NULL DEFAULT 1,
  failure_reason VARCHAR(120) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_user_login_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_login_logs_user_created (user_id, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE refresh_tokens
  ADD COLUMN ip_address VARCHAR(45) NULL AFTER expires_at,
  ADD COLUMN user_agent VARCHAR(500) NULL AFTER ip_address,
  ADD COLUMN device_label VARCHAR(120) NULL AFTER user_agent;
