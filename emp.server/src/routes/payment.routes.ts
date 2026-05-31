import { Router } from 'express';
import { ADMIN_PANEL_ROLES } from '../constants/roles';
import { paymentController } from '../controllers/payment.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const paymentRouter = Router();

paymentRouter.post('/callbacks/payos', paymentController.payOSCallback);
paymentRouter.post('/callbacks/zalopay', paymentController.zaloPayCallback);
paymentRouter.get('/return/zalopay', paymentController.zaloPayReturn);
paymentRouter.get('/return', paymentController.payOSReturn);

paymentRouter.use(authenticate);

paymentRouter.get('/return/resolve', paymentController.resolveReturn);
paymentRouter.get('/methods', paymentController.methods);
paymentRouter.get('/orders/:idOrCode', paymentController.listByOrder);
paymentRouter.post('/orders/:idOrCode/checkout', paymentController.createCheckout);
paymentRouter.post('/orders/:idOrCode/retry', paymentController.retryCheckout);
paymentRouter.post('/:paymentCode/sync', paymentController.syncStatus);
paymentRouter.post('/:paymentCode/cancel', paymentController.cancel);
paymentRouter.get('/:paymentCode', paymentController.detail);

paymentRouter.get(
  '/',
  requireRoles(...ADMIN_PANEL_ROLES),
  requirePermissions('payments.view'),
  paymentController.list,
);

export default paymentRouter;
