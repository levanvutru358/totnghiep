import { Request, Response } from 'express';
import { notificationService } from '../services/notification.service';
import { sendError, sendSuccess } from '../utils/api-response';

export const notificationController = {
  async list(req: Request, res: Response) {
    try {
      if (!req.user) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      const data = await notificationService.list(req.user.id, req.query as Record<string, unknown>);
      return sendSuccess(res, 200, 'Notifications fetched', data);
    } catch {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async markRead(req: Request, res: Response) {
    try {
      if (!req.user) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      await notificationService.markRead(req.user.id, Number(req.params.id));
      return sendSuccess(res, 200, 'Notification read', null);
    } catch {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async markAllRead(req: Request, res: Response) {
    try {
      if (!req.user) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      await notificationService.markAllRead(req.user.id);
      return sendSuccess(res, 200, 'All notifications read', null);
    } catch {
      return sendError(res, 500, 'Internal server error');
    }
  },

  async unreadCount(req: Request, res: Response) {
    try {
      if (!req.user) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      const data = await notificationService.unreadCount(req.user.id);
      return sendSuccess(res, 200, 'Unread count fetched', data);
    } catch {
      return sendError(res, 500, 'Internal server error');
    }
  },
};
