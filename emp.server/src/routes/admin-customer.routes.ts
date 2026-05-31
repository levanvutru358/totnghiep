import { Router } from 'express';
import { UserRole } from '../constants/roles';
import { adminCustomerController } from '../controllers/admin-customer.controller';
import { authenticate, requirePermissions, requireRoles } from '../middleware/auth.middleware';

const adminCustomerRouter = Router();

adminCustomerRouter.use(authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.STAFF));

adminCustomerRouter.get('/', requirePermissions('customers.view'), adminCustomerController.list);
adminCustomerRouter.get('/:customerId', requirePermissions('customers.view'), adminCustomerController.detail);
adminCustomerRouter.patch('/:customerId', requirePermissions('customers.manage'), adminCustomerController.update);
adminCustomerRouter.post('/:customerId/lock', requirePermissions('customers.manage'), adminCustomerController.lock);
adminCustomerRouter.post('/:customerId/temp-lock', requirePermissions('customers.manage'), adminCustomerController.tempLock);
adminCustomerRouter.post('/:customerId/unlock', requirePermissions('customers.manage'), adminCustomerController.unlock);

export default adminCustomerRouter;
