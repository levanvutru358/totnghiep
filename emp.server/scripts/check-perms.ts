import { pool } from '../src/configs/database.config';
import { permissionRepository } from '../src/repositories/permission.repository';

async function main() {
  const [users] = await pool.query(
    `
    SELECT u.id, u.email, u.role_id, r.code AS role
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.email IN ('admin@emp.local', 'superadmin@emp.local', 'staff@emp.local')
    `,
  );
  console.log('users:', users);

  for (const u of users as Array<{ id: number; email: string; role: string; role_id: number }>) {
    const perms = await permissionRepository.getUserPermissionCodes(u.id);
    console.log(
      u.email,
      `role_id=${u.role_id}`,
      `perms=${perms.length}`,
      `orders.view=${perms.includes('orders.view')}`,
      `customers.view=${perms.includes('customers.view')}`,
    );
  }

  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
