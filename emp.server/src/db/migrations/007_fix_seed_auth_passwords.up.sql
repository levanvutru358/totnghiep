-- Update seeded auth users to password: DevPassword123!
-- bcrypt hash generated with cost 10.

UPDATE users
SET password_hash = '$2b$10$vXN6KfwBTAmdgAXi26f.tOphqdD8uQN7tCGQrj1GULB2S.tnaKolO',
    updated_at = CURRENT_TIMESTAMP
WHERE email IN (
  'superadmin@emp.local',
  'admin@emp.local',
  'staff@emp.local',
  'customer@emp.local'
);
