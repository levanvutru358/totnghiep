import { Router } from 'express';
import { sizeController } from '../controllers/size.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const sizeRouter = Router();

sizeRouter.get('/', sizeController.list);
sizeRouter.get('/:id', sizeController.detail);
sizeRouter.post('/', authenticate, requirePermissions('categories.create'), sizeController.create);
sizeRouter.put('/:id', authenticate, requirePermissions('categories.update'), sizeController.update);
sizeRouter.delete('/:id', authenticate, requirePermissions('categories.delete'), sizeController.remove);

export default sizeRouter;
