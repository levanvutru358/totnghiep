import { Router } from 'express';
import { variantController } from '../controllers/variant.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const variantRouter = Router();

variantRouter.get('/', variantController.list);
variantRouter.get('/:id', variantController.detail);
variantRouter.get('/:id/stock', variantController.stock);
variantRouter.post('/', authenticate, requirePermissions('products.create'), variantController.create);
variantRouter.put('/:id', authenticate, requirePermissions('products.update'), variantController.update);
variantRouter.delete('/:id', authenticate, requirePermissions('products.delete'), variantController.remove);

export default variantRouter;
