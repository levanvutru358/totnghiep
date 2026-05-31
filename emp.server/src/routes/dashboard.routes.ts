import { Router } from 'express';
import { ADMIN_PANEL_ROLES } from '../constants/roles';
import { dashboardController } from '../controllers/dashboard.controller';
import { authenticate, requireRoles } from '../middleware/auth.middleware';

const dashboardRouter = Router();

dashboardRouter.use(authenticate, requireRoles(...ADMIN_PANEL_ROLES));

dashboardRouter.get('/metrics', dashboardController.metrics);
dashboardRouter.get('/revenue-series', dashboardController.revenueSeries);
dashboardRouter.get('/recent-orders', dashboardController.recentOrders);
dashboardRouter.get('/low-stock', dashboardController.lowStock);
dashboardRouter.get('/top-customers', dashboardController.topCustomers);
dashboardRouter.get('/top-categories', dashboardController.topCategories);
dashboardRouter.get('/order-status-distribution', dashboardController.orderStatusDistribution);

export default dashboardRouter;
