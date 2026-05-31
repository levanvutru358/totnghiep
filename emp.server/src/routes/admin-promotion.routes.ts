import { Router } from 'express';
import { UserRole } from '../constants/roles';
import { promotionController } from '../controllers/promotion.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminPromotionRouter = Router();

adminPromotionRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN));

adminPromotionRouter.get('/', requirePermissions('promotions.view'), promotionController.list);
adminPromotionRouter.get('/:promotionId', requirePermissions('promotions.view'), promotionController.detail);
adminPromotionRouter.post('/', requirePermissions('promotions.create'), promotionController.create);
adminPromotionRouter.patch(
  '/:promotionId',
  requirePermissions('promotions.update'),
  promotionController.update,
);
adminPromotionRouter.delete(
  '/:promotionId',
  requirePermissions('promotions.delete'),
  promotionController.remove,
);

export default adminPromotionRouter;
