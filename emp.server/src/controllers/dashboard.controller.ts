import { Request, Response } from 'express';
import { dashboardService } from '../services/dashboard.service';
import { sendError, sendSuccess } from '../utils/api-response';

export const dashboardController = {
  async metrics(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getMetrics();
      return sendSuccess(res, 200, 'Dashboard metrics fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async revenueSeries(req: Request, res: Response) {
    try {
      const data = await dashboardService.getRevenueSeries(req.query.range);
      return sendSuccess(res, 200, 'Revenue series fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async recentOrders(req: Request, res: Response) {
    try {
      const data = await dashboardService.getRecentOrders(req.query.status);
      return sendSuccess(res, 200, 'Recent orders fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async lowStock(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getLowStockProducts();
      return sendSuccess(res, 200, 'Low stock products fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async topCustomers(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getTopCustomers();
      return sendSuccess(res, 200, 'Top customers fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async topCategories(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getTopCategories();
      return sendSuccess(res, 200, 'Top categories fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async orderStatusDistribution(_req: Request, res: Response) {
    try {
      const data = await dashboardService.getOrderStatusDistribution();
      return sendSuccess(res, 200, 'Order status distribution fetched successfully', data);
    } catch (_error) {
      return sendError(res, 500, 'Internal server error');
    }
  },
};
