import { Router } from 'express';
import { colorController } from '../controllers/color.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const colorRouter = Router();

colorRouter.get('/', colorController.list);
colorRouter.get('/:id', colorController.detail);
colorRouter.post('/', authenticate, requirePermissions('categories.create'), colorController.create);
colorRouter.put('/:id', authenticate, requirePermissions('categories.update'), colorController.update);
colorRouter.delete('/:id', authenticate, requirePermissions('categories.delete'), colorController.remove);

export default colorRouter;
