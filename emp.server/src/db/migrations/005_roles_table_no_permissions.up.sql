-- RBAC (role-only): normalize roles into dedicated table (no permissions)

CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
  code VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_roles_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO roles (code, name)
VALUES
  ('SUPER_ADMIN', 'Super Admin'),
  ('ADMIN', 'Admin'),
  ('STAFF', 'Staff'),
  ('CUSTOMER', 'Customer')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  updated_at = CURRENT_TIMESTAMP;

ALTER TABLE users
  ADD COLUMN role_id BIGINT UNSIGNED NULL AFTER full_name;

UPDATE users u
JOIN roles r ON r.code = u.role
SET u.role_id = r.id
WHERE u.role_id IS NULL;

ALTER TABLE users
  MODIFY COLUMN role_id BIGINT UNSIGNED NOT NULL,
  ADD INDEX idx_users_role_id (role_id),
  ADD CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id);
