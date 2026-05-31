import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { UserRole } from '../constants/roles';
import { authController } from '../controllers/auth.controller';
import { permissionController } from '../controllers/permission.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';

const router = Router();

const authWindowMs = 15 * 60 * 1000;

const generalLimiter = rateLimit({
  windowMs: authWindowMs,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: authWindowMs,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/register', generalLimiter, authController.register);
router.post('/login', strictLimiter, authController.login);
router.post('/refresh', generalLimiter, authController.refresh);
router.post('/logout', generalLimiter, authController.logout);
router.get('/me', authenticate, authController.me);
router.get('/rbac/roles', authenticate, requireRoles(UserRole.SUPER_ADMIN), permissionController.listRolePermissions);
router.put(
  '/rbac/roles/:roleCode',
  authenticate,
  requireRoles(UserRole.SUPER_ADMIN),
  permissionController.updateRolePermissions,
);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/forgot-password', strictLimiter, authController.forgotPassword);
router.post('/reset-password', strictLimiter, authController.resetPassword);

export default router;
