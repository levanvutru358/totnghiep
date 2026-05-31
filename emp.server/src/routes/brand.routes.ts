import { Router } from 'express';
import { brandController } from '../controllers/brand.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const brandRouter = Router();

brandRouter.get('/', brandController.list);
brandRouter.get('/:idOrSlug', brandController.detail);
brandRouter.post('/', authenticate, requirePermissions('categories.create'), brandController.create);
brandRouter.put('/:idOrSlug', authenticate, requirePermissions('categories.update'), brandController.update);
brandRouter.delete('/:idOrSlug', authenticate, requirePermissions('categories.delete'), brandController.remove);

export default brandRouter;
