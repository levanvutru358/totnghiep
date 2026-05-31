import type { Request, Response } from 'express';
import { isUserRole, UserRole } from '../constants/roles';
import { permissionRepository } from '../repositories/permission.repository';
import { sendError, sendSuccess } from '../utils/api-response';

const mapError = (error: unknown): { status: number; message: string; code?: string } => {
  const m = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  if (m === 'INVALID_ROLE') return { status: 400, message: 'Invalid role', code: 'INVALID_ROLE' };
  if (m === 'INVALID_PERMISSION_CODES')
    return { status: 400, message: 'Invalid permission codes', code: 'INVALID_PERMISSION_CODES' };
  return { status: 500, message: 'Internal server error' };
};

export const permissionController = {
  async listRolePermissions(_req: Request, res: Response) {
    try {
      const [allPermissions, roles] = await Promise.all([
        permissionRepository.getAllPermissionCodes(),
        permissionRepository.getRolePermissionsMatrix(),
      ]);
      return sendSuccess(res, 200, 'Permissions fetched', { allPermissions, roles });
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
  },

  async updateRolePermissions(req: Request, res: Response) {
    try {
      const roleCode = String(req.params.roleCode || '').toUpperCase();
      if (!isUserRole(roleCode) || roleCode === UserRole.CUSTOMER) {
        throw new Error('INVALID_ROLE');
      }

      const body = req.body as { permissionCodes?: string[] };
      const permissionCodes = Array.isArray(body?.permissionCodes) ? body.permissionCodes : [];
      const allPermissionCodes = await permissionRepository.getAllPermissionCodes();
      const allSet = new Set(allPermissionCodes);
      const hasInvalid = permissionCodes.some((code) => !allSet.has(code));
      if (hasInvalid) throw new Error('INVALID_PERMISSION_CODES');

      await permissionRepository.replaceRolePermissions(roleCode, permissionCodes);
      const roles = await permissionRepository.getRolePermissionsMatrix();
      return sendSuccess(res, 200, 'Role permissions updated', { roles });
    } catch (error) {
      const mapped = mapError(error);
      return sendError(res, mapped.status, mapped.message, mapped.code);
    }
  },
};
