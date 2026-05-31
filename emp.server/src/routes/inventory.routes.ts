import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { authenticate, requirePermissions } from '../middleware/auth.middleware';

const inventoryRouter = Router();

// Backward-compatible endpoints used by existing admin screens.
inventoryRouter.get('/', inventoryController.list);
inventoryRouter.post('/', authenticate, requirePermissions('inventory.adjust'), inventoryController.create);

inventoryRouter.get('/transactions', inventoryController.list);
inventoryRouter.post('/transactions', authenticate, requirePermissions('inventory.adjust'), inventoryController.create);
inventoryRouter.put(
  '/transactions/:id',
  authenticate,
  requirePermissions('inventory.adjust'),
  inventoryController.update,
);
inventoryRouter.delete(
  '/transactions/:id',
  authenticate,
  requirePermissions('inventory.adjust'),
  inventoryController.remove,
);

export default inventoryRouter;
