import { Request, Response } from 'express';
import { publicRevisionService } from '../services/public-revision.service';
import { sendError, sendSuccess } from '../utils/api-response';

export const publicController = {
  async getContentRevision(_req: Request, res: Response) {
    try {
      const revision = await publicRevisionService.getRevision();
      return sendSuccess(res, 200, 'Public content revision', { revision });
    } catch {
      return sendError(res, 500, 'Internal server error', 'INTERNAL_SERVER_ERROR');
    }
  },
};
