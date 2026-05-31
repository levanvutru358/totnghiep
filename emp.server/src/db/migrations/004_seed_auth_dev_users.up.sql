-- Dev-only seed users (password: DevPassword123!) — bcrypt cost 10
-- Remove or replace in production; same password for all four demo accounts.

INSERT INTO users (email, password_hash, full_name, role, is_active)
VALUES
  (
    'superadmin@emp.local',
    '$2b$10$z0SY0/Uwf2pq9ZBbLq0pIOTDIPMbJThtSw5B.7xd1qieGzojG/zHa',
    'Super Admin',
    'SUPER_ADMIN',
    1
  ),
  (
    'admin@emp.local',
    '$2b$10$z0SY0/Uwf2pq9ZBbLq0pIOTDIPMbJThtSw5B.7xd1qieGzojG/zHa',
    'Admin',
    'ADMIN',
    1
  ),
  (
    'staff@emp.local',
    '$2b$10$z0SY0/Uwf2pq9ZBbLq0pIOTDIPMbJThtSw5B.7xd1qieGzojG/zHa',
    'Staff',
    'STAFF',
    1
  ),
  (
    'customer@emp.local',
    '$2b$10$z0SY0/Uwf2pq9ZBbLq0pIOTDIPMbJThtSw5B.7xd1qieGzojG/zHa',
    'Customer',
    'CUSTOMER',
    1
  )
ON DUPLICATE KEY UPDATE
  full_name = VALUES(full_name),
  role = VALUES(role),
  is_active = VALUES(is_active),
  updated_at = CURRENT_TIMESTAMP;
