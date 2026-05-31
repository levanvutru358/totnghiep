import { Router } from 'express';
import { ADMIN_PANEL_ROLES } from '../constants/roles';
import { orderController } from '../controllers/order.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminOrderRouter = Router();

adminOrderRouter.use(authenticate, requireRoles(...ADMIN_PANEL_ROLES));

adminOrderRouter.get(
  '/',
  requirePermissions('orders.view'),
  orderController.list,
);

adminOrderRouter.get(
  '/export',
  requirePermissions('orders.view'),
  orderController.export,
);

adminOrderRouter.get(
  '/returns',
  requirePermissions('orders.manage_returns'),
  orderController.listReturns,
);

adminOrderRouter.get(
  '/returns/:returnId',
  requirePermissions('orders.manage_returns'),
  orderController.detailReturn,
);

adminOrderRouter.get(
  '/:orderId',
  requirePermissions('orders.view'),
  orderController.detail,
);

adminOrderRouter.patch(
  '/:orderId/status',
  requirePermissions('orders.update'),
  orderController.updateStatus,
);

adminOrderRouter.post(
  '/:orderId/confirm',
  requirePermissions('orders.update'),
  orderController.confirm,
);

adminOrderRouter.post(
  '/:orderId/complete',
  requirePermissions('orders.update'),
  orderController.complete,
);

adminOrderRouter.post(
  '/:orderId/cancel',
  requirePermissions('orders.cancel'),
  orderController.cancel,
);

adminOrderRouter.post(
  '/:orderId/refund',
  requirePermissions('orders.manage_payments'),
  orderController.refund,
);

adminOrderRouter.post(
  '/:orderId/return/approve',
  requirePermissions('orders.manage_returns'),
  orderController.approveReturn,
);

adminOrderRouter.post(
  '/:orderId/return/reject',
  requirePermissions('orders.manage_returns'),
  orderController.rejectReturn,
);

export default adminOrderRouter;
