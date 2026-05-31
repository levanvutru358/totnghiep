import { Router } from 'express';
import { cartController } from '../controllers/cart.controller';
import { authenticate } from '../middleware/auth.middleware';

const cartRouter = Router();

cartRouter.use(authenticate);

cartRouter.get('/', cartController.detail);
cartRouter.post('/items', cartController.addItem);
cartRouter.patch('/items/:itemId', cartController.updateItem);
cartRouter.delete('/items/:itemId', cartController.removeItem);
cartRouter.post('/select-all', cartController.selectAll);
cartRouter.post('/select', cartController.selectItems);
cartRouter.delete('/', cartController.clear);
cartRouter.post('/validate', cartController.validate);
cartRouter.post('/merge', cartController.merge);
cartRouter.post('/checkout/preview', cartController.previewCheckout);
cartRouter.post('/checkout', cartController.checkout);

export default cartRouter;
