import type { RowDataPacket } from 'mysql2';
import { pool } from '../configs/database.config';
import type { UserRole } from '../constants/roles';

export interface RolePermissionsRow {
  role: UserRole;
  permissions: string[];
}

export const permissionRepository = {
  async getUserPermissionCodes(userId: number): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT p.code
      FROM users u
      INNER JOIN roles r ON r.id = u.role_id
      INNER JOIN role_permissions rp ON rp.role_id = r.id
      INNER JOIN permissions p ON p.id = rp.permission_id
      WHERE u.id = ?
      ORDER BY p.code ASC
      `,
      [userId],
    );
    return rows.map((row) => String(row.code));
  },

  async getAllPermissionCodes(): Promise<string[]> {
    const [rows] = await pool.query<RowDataPacket[]>(`SELECT code FROM permissions ORDER BY code ASC`);
    return rows.map((row) => String(row.code));
  },

  async getRolePermissionsMatrix(): Promise<RolePermissionsRow[]> {
    const [rows] = await pool.query<RowDataPacket[]>(
      `
      SELECT r.code AS role, p.code AS permission_code
      FROM roles r
      LEFT JOIN role_permissions rp ON rp.role_id = r.id
      LEFT JOIN permissions p ON p.id = rp.permission_id
      ORDER BY r.code ASC, p.code ASC
      `,
    );

    const grouped = new Map<string, string[]>();
    rows.forEach((row) => {
      const role = String(row.role);
      if (!grouped.has(role)) grouped.set(role, []);
      const code = row.permission_code ? String(row.permission_code) : '';
      if (code) grouped.get(role)?.push(code);
    });

    return Array.from(grouped.entries()).map(([role, permissions]) => ({
      role: role as UserRole,
      permissions,
    }));
  },

  async replaceRolePermissions(roleCode: UserRole, permissionCodes: string[]): Promise<void> {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        `
        DELETE rp FROM role_permissions rp
        INNER JOIN roles r ON r.id = rp.role_id
        WHERE r.code = ?
        `,
        [roleCode],
      );

      if (permissionCodes.length > 0) {
        await conn.query(
          `
          INSERT INTO role_permissions (role_id, permission_id)
          SELECT r.id, p.id
          FROM roles r
          INNER JOIN permissions p ON p.code IN (?)
          WHERE r.code = ?
          `,
          [permissionCodes, roleCode],
        );
      }

      await conn.commit();
    } catch (error) {
      await conn.rollback();
      throw error;
    } finally {
      conn.release();
    }
  },
};
