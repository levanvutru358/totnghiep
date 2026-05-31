import { Router } from 'express';
import { shopSettingsController } from '../controllers/shop-settings.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';
import { UserRole } from '../constants/roles';

const adminSettingsRouter = Router();

adminSettingsRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

adminSettingsRouter.get('/', requirePermissions('settings.view'), shopSettingsController.getAdmin);
adminSettingsRouter.patch('/', requirePermissions('settings.manage'), shopSettingsController.update);

export default adminSettingsRouter;
