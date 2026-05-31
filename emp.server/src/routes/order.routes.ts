import { Router } from 'express';
import { orderController } from '../controllers/order.controller';
import { authenticate } from '../middleware/auth.middleware';

const orderRouter = Router();

orderRouter.use(authenticate);

orderRouter.get('/my', orderController.listMine);
orderRouter.post('/', orderController.create);
orderRouter.get('/:idOrCode/status', orderController.status);
orderRouter.get('/:idOrCode/timeline', orderController.timeline);
orderRouter.get('/:idOrCode/invoice', orderController.invoice);
orderRouter.post('/:idOrCode/reorder', orderController.reorder);
orderRouter.get('/:idOrCode', orderController.detail);
orderRouter.post('/:idOrCode/cancel', orderController.cancel);
orderRouter.post('/:idOrCode/complete', orderController.complete);
orderRouter.post('/:idOrCode/returns/request', orderController.requestReturn);

export default orderRouter;
