import { Router } from 'express';
import { UserRole } from '../constants/roles';
import { reviewController } from '../controllers/review.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminReviewRouter = Router();

adminReviewRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF));

adminReviewRouter.get('/statistics', requirePermissions('reviews.view'), reviewController.adminStatistics);
adminReviewRouter.get('/', requirePermissions('reviews.view'), reviewController.listAdmin);
adminReviewRouter.get('/:reviewId', requirePermissions('reviews.view'), reviewController.detailAdmin);
adminReviewRouter.patch('/:reviewId/hide', requirePermissions('reviews.manage'), reviewController.hide);
adminReviewRouter.delete('/:reviewId', requirePermissions('reviews.manage'), reviewController.removeAdmin);

export default adminReviewRouter;
