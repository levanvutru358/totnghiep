import { Router } from 'express';
import { ADMIN_PANEL_ROLES } from '../constants/roles';
import { cartController } from '../controllers/cart.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminCartRouter = Router();

adminCartRouter.use(authenticate);

adminCartRouter.get(
  '/',
  requireRoles(...ADMIN_PANEL_ROLES),
  requirePermissions('carts.view'),
  cartController.adminList,
);

adminCartRouter.get(
  '/users/:userId',
  requireRoles(...ADMIN_PANEL_ROLES),
  requirePermissions('carts.view'),
  cartController.adminDetail,
);

export default adminCartRouter;
