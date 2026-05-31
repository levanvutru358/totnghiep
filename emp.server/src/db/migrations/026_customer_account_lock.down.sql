ALTER TABLE refresh_tokens
  DROP COLUMN device_label,
  DROP COLUMN user_agent,
  DROP COLUMN ip_address;

DROP TABLE IF EXISTS user_login_logs;

ALTER TABLE users
  DROP FOREIGN KEY fk_users_locked_by,
  DROP INDEX idx_users_account_status,
  DROP COLUMN locked_by,
  DROP COLUMN locked_at,
  DROP COLUMN locked_until,
  DROP COLUMN lock_reason,
  DROP COLUMN account_status;
