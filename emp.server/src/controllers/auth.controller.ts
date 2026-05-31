import { Request, Response } from 'express';
import { authConfig } from '../configs/auth.config';
import { authService } from '../services/auth.service';
import { parseDurationToMs } from '../utils/time';
import { sendError, sendSuccess } from '../utils/api-response';
import { AccountLockError } from '../services/account-lock.service';
import { getClientIp } from '../utils/user-agent';

const mapAuthError = (error: unknown): { status: number; message: string; errorCode?: string } => {
  const message = error instanceof Error ? error.message : 'INTERNAL_SERVER_ERROR';
  const map: Record<string, { status: number; message: string; errorCode?: string }> = {
    EMAIL_EXISTS: { status: 409, message: 'Email already registered', errorCode: 'EMAIL_EXISTS' },
    REGISTRATION_DISABLED: {
      status: 403,
      message: 'Đăng ký tài khoản mới đang tạm tắt',
      errorCode: 'REGISTRATION_DISABLED',
    },
    INVALID_CREDENTIALS: { status: 401, message: 'Invalid email or password', errorCode: 'INVALID_CREDENTIALS' },
    ACCOUNT_DISABLED: { status: 403, message: 'Account is disabled', errorCode: 'ACCOUNT_DISABLED' },
    INVALID_EMAIL: { status: 400, message: 'Invalid email', errorCode: 'INVALID_EMAIL' },
    WEAK_PASSWORD: {
      status: 400,
      message: `Password must be at least 8 characters`,
      errorCode: 'WEAK_PASSWORD',
    },
    USER_NOT_FOUND: { status: 404, message: 'User not found', errorCode: 'USER_NOT_FOUND' },
    MISSING_REFRESH_TOKEN: {
      status: 400,
      message: 'Refresh token is required',
      errorCode: 'MISSING_REFRESH_TOKEN',
    },
    INVALID_REFRESH_TOKEN: {
      status: 401,
      message: 'Invalid or expired refresh token',
      errorCode: 'INVALID_REFRESH_TOKEN',
    },
    MISSING_RESET_TOKEN: {
      status: 400,
      message: 'Reset token is required',
      errorCode: 'MISSING_RESET_TOKEN',
    },
    INVALID_RESET_TOKEN: {
      status: 400,
      message: 'Invalid or expired reset token',
      errorCode: 'INVALID_RESET_TOKEN',
    },
    ACCOUNT_LOCKED: { status: 403, message: 'Tài khoản đã bị khóa', errorCode: 'ACCOUNT_LOCKED' },
    ACCOUNT_TEMP_LOCKED: {
      status: 403,
      message: 'Tài khoản đang bị tạm khóa',
      errorCode: 'ACCOUNT_TEMP_LOCKED',
    },
  };
  return map[message] ?? { status: 500, message: 'Internal server error' };
};

const authMeta = (req: Request) => ({
  ipAddress: getClientIp(req),
  userAgent: typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null,
});

const getRefreshTokenFromRequest = (req: Request): string => {
  const fromCookie = req.cookies?.[authConfig.refreshCookieName];
  if (typeof fromCookie === 'string' && fromCookie.length > 0) return fromCookie;

  const body = req.body as { refreshToken?: string } | undefined;
  if (body?.refreshToken) return body.refreshToken;
  return '';
};

const setRefreshCookie = (res: Response, refreshToken: string): void => {
  res.cookie(authConfig.refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: authConfig.refreshCookieSecure,
    sameSite: authConfig.refreshCookieSameSite,
    path: authConfig.refreshCookiePath,
    maxAge: parseDurationToMs(authConfig.jwtRefreshExpiresIn),
  });
};

const clearRefreshCookie = (res: Response): void => {
  res.clearCookie(authConfig.refreshCookieName, {
    httpOnly: true,
    secure: authConfig.refreshCookieSecure,
    sameSite: authConfig.refreshCookieSameSite,
    path: authConfig.refreshCookiePath,
  });
};

export const authController = {
  async register(req: Request, res: Response) {
    try {
      const data = await authService.register(req.body);
      return sendSuccess(res, 201, 'Registered successfully', data);
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async login(req: Request, res: Response) {
    try {
      const data = await authService.login(req.body, authMeta(req));
      setRefreshCookie(res, data.refreshToken);
      return sendSuccess(res, 200, 'Logged in successfully', {
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
      });
    } catch (error) {
      if (error instanceof AccountLockError) {
        const mapped = mapAuthError(error);
        const reason = error.lockReason?.trim();
        const until = error.lockedUntil ? new Date(error.lockedUntil).toISOString() : null;
        const message = reason
          ? until
            ? `${mapped.message}: ${reason} (đến ${new Date(until).toLocaleString('vi-VN')})`
            : `${mapped.message}: ${reason}`
          : mapped.message;
        return sendError(res, mapped.status, message, mapped.errorCode, undefined, {
          lockReason: reason,
          lockedUntil: until,
        });
      }
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      const data = await authService.refresh(refreshToken);
      setRefreshCookie(res, data.refreshToken);
      return sendSuccess(res, 200, 'Token refreshed', {
        accessToken: data.accessToken,
        expiresIn: data.expiresIn,
      });
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const refreshToken = getRefreshTokenFromRequest(req);
      const data = await authService.logout(refreshToken);
      clearRefreshCookie(res);
      return sendSuccess(res, 200, 'Logged out successfully', data);
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async me(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      const data = await authService.me(userId);
      return sendSuccess(res, 200, 'Profile loaded', data);
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async changePassword(req: Request, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) return sendError(res, 401, 'Unauthorized', 'UNAUTHORIZED');
      const data = await authService.changePassword(userId, req.body);
      return sendSuccess(res, 200, 'Password updated', data);
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async forgotPassword(req: Request, res: Response) {
    try {
      const data = await authService.forgotPassword(req.body);
      return sendSuccess(res, 200, 'Request processed', { message: data.message });
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },

  async resetPassword(req: Request, res: Response) {
    try {
      const data = await authService.resetPassword(req.body);
      return sendSuccess(res, 200, 'Password has been reset', data);
    } catch (error) {
      const mapped = mapAuthError(error);
      return sendError(res, mapped.status, mapped.message, mapped.errorCode);
    }
  },
};
