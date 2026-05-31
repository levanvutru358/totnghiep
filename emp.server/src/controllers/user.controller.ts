import { Request, Response } from 'express';
import { userService } from '../services/user.service';
import { sendError, sendSuccess } from '../utils/api-response';

const mapUserError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const map: Record<string, { status: number; message: string; errorCode?: string }> = {
    USER_NOT_FOUND: { status: 404, message: 'User not found', errorCode: 'USER_NOT_FOUND' },
    NO_UPDATABLE_FIELDS: {
      status: 400,
      message: 'No updatable fields provided',
      errorCode: 'NO_UPDATABLE_FIELDS',
    },
    INVALID_FULL_NAME: {
      status: 400,
      message: 'Full name is invalid or too long',
      errorCode: 'INVALID_FULL_NAME',
    },
  };
  return map[message] ?? { status: 500, message: 'Internal server error' };
};

export const userController = {
  async updateMe(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      const data = await userService.updateMe(userId, req.body);
      return sendSuccess(res, 200, 'Profile updated', data);
    } catch (error) {
      const mapped = mapUserError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
