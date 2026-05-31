import { NextFunction, Request, Response } from 'express';
import { isUserRole, UserRole } from '../constants/roles';
import { permissionRepository } from '../repositories/permission.repository';
import { userRepository } from '../repositories/user.repository';
import { sendError } from '../utils/api-response';
import { verifyAccessToken } from '../utils/jwt';

/** Fallback when migration 009/032 was not applied — matches intended RBAC. */
const ROLE_PERMISSION_FALLBACK: Partial<Record<UserRole, readonly string[]>> = {
  [UserRole.SUPER_ADMIN]: ['*'],
  [UserRole.ADMIN]: [
    'products.create',
    'products.update',
    'products.delete',
    'categories.create',
    'categories.update',
    'categories.delete',
    'inventory.adjust',
  ],
  [UserRole.STAFF]: ['products.update', 'inventory.adjust'],
};

const hasRequiredPermissions = (
  role: UserRole,
  currentPermissions: string[],
  required: string[],
): boolean => {
  const fallback = ROLE_PERMISSION_FALLBACK[role] ?? [];
  if (fallback.includes('*')) return true;

  const effective = new Set([...currentPermissions, ...fallback]);
  return required.every((code) => effective.has(code));
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }
  const token = authHeader.slice(7).trim();
  if (!token) {
    return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
  }
  try {
    const payload = verifyAccessToken(token);
    const id = Number(payload.sub);
    if (!Number.isFinite(id)) {
      return sendError(res, 401, 'Invalid token', 'INVALID_TOKEN');
    }

    const user = await userRepository.findById(id);
    if (!user || !user.is_active || !isUserRole(user.role)) {
      return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }

    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  } catch {
    return sendError(res, 401, 'Invalid or expired token', 'INVALID_TOKEN');
  }
};

export const requireRoles =
  (...allowed: UserRole[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
    }
    if (!allowed.includes(req.user.role)) {
      return sendError(res, 403, 'Forbidden', 'FORBIDDEN');
    }
    return next();
  };

export const requirePermissions =
  (...required: string[]) =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      }

      const currentPermissions =
        req.user.permissions ?? (await permissionRepository.getUserPermissionCodes(req.user.id));
      req.user.permissions = currentPermissions;

      if (!hasRequiredPermissions(req.user.role, currentPermissions, required)) {
        return sendError(res, 403, 'Forbidden', 'FORBIDDEN');
      }
      return next();
    } catch {
      return sendError(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    }
  };
