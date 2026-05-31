import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const categoryRouter = Router();

categoryRouter.get('/', categoryController.list);
categoryRouter.get('/:idOrSlug', categoryController.detail);
categoryRouter.post('/', authenticate, requirePermissions('categories.create'), categoryController.create);
categoryRouter.put('/:idOrSlug', authenticate, requirePermissions('categories.update'), categoryController.update);
categoryRouter.delete('/:idOrSlug', authenticate, requirePermissions('categories.delete'), categoryController.remove);

export default categoryRouter;
