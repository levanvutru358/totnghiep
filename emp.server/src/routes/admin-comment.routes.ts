import { Router } from 'express';
import { UserRole } from '../constants/roles';
import { commentController } from '../controllers/comment.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminCommentRouter = Router();

adminCommentRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF));

adminCommentRouter.get('/', requirePermissions('comments.view'), commentController.listAdmin);
adminCommentRouter.patch('/:commentId/hide', requirePermissions('comments.manage'), commentController.hide);
adminCommentRouter.patch('/:commentId/show', requirePermissions('comments.manage'), commentController.show);
adminCommentRouter.delete('/:commentId', requirePermissions('comments.manage'), commentController.removeAdmin);

export default adminCommentRouter;
