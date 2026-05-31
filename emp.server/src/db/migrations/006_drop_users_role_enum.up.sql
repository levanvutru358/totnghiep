-- Clean up role-only RBAC schema:
-- keep users.role_id -> roles.id and remove legacy users.role enum column.

ALTER TABLE users
  DROP COLUMN role;
