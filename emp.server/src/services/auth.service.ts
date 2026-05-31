import bcrypt from 'bcryptjs';
import { authConfig } from '../configs/auth.config';
import { UserRole } from '../constants/roles';
import { permissionRepository } from '../repositories/permission.repository';
import { passwordResetRepository } from '../repositories/password-reset.repository';
import { refreshTokenRepository } from '../repositories/refresh-token.repository';
import { userRepository, type UserRow } from '../repositories/user.repository';
import { randomOpaqueToken, sha256Hex } from '../utils/crypto-token';
import { signAccessToken } from '../utils/jwt';
import { sendMail } from '../utils/mail';
import { parseDurationToMs } from '../utils/time';
import { accountLockService, AccountLockError } from './account-lock.service';
import { parseDeviceLabel } from '../utils/user-agent';
import { shopSettingsService } from './shop-settings.service';

const MIN_PASSWORD_LEN = 8;

const toPublicUser = (row: UserRow) => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  isActive: Boolean(row.is_active),
  accountStatus: row.account_status,
  lockReason: row.lock_reason,
  lockedUntil: row.locked_until,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export interface AuthRequestMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

const issueTokensForUser = async (user: UserRow, meta?: AuthRequestMeta) => {
  const accessToken = signAccessToken(user.id, user.email, user.role);
  const rawRefresh = randomOpaqueToken();
  const tokenHash = sha256Hex(rawRefresh);
  const expiresAt = new Date(Date.now() + parseDurationToMs(authConfig.jwtRefreshExpiresIn));
  const deviceLabel = parseDeviceLabel(meta?.userAgent);
  await refreshTokenRepository.insert(user.id, tokenHash, expiresAt, {
    ipAddress: meta?.ipAddress,
    userAgent: meta?.userAgent,
    deviceLabel,
  });
  return {
    accessToken,
    refreshToken: rawRefresh,
    expiresIn: authConfig.jwtAccessExpiresIn,
  };
};

const assertPassword = (password: string): void => {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LEN) {
    throw new Error('WEAK_PASSWORD');
  }
};

const assertEmail = (email: string): void => {
  const trimmed = typeof email === 'string' ? email.trim() : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    throw new Error('INVALID_EMAIL');
  }
};

export const authService = {
  async register(body: { email?: string; password?: string; fullName?: string | null }) {
    const settings = await shopSettingsService.getPublic();
    if (!settings.registrationEnabled) {
      throw new Error('REGISTRATION_DISABLED');
    }

    assertEmail(body.email ?? '');
    assertPassword(body.password ?? '');
    const existing = await userRepository.findByEmail(body.email ?? '');
    if (existing) throw new Error('EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(body.password ?? '', authConfig.bcryptRounds);
    const id = await userRepository.create({
      email: body.email ?? '',
      passwordHash,
      fullName: body.fullName ?? null,
      role: UserRole.CUSTOMER,
    });
    const user = await userRepository.findById(id);
    if (!user) throw new Error('USER_NOT_FOUND');

    const tokens = await issueTokensForUser(user);
    return { user: toPublicUser(user), ...tokens };
  },

  async login(body: { email?: string; password?: string }, meta?: AuthRequestMeta) {
    assertEmail(body.email ?? '');
    const user = await userRepository.findByEmail(body.email ?? '');
    const deviceLabel = parseDeviceLabel(meta?.userAgent);
    if (!user) throw new Error('INVALID_CREDENTIALS');

    const ok = await bcrypt.compare(body.password ?? '', user.password_hash);
    if (!ok) {
      await accountLockService.logLoginAttempt({
        userId: user.id,
        ipAddress: meta?.ipAddress,
        userAgent: meta?.userAgent,
        deviceLabel,
        isSuccess: false,
        failureReason: 'INVALID_CREDENTIALS',
      });
      throw new Error('INVALID_CREDENTIALS');
    }

    const fresh = await accountLockService.refreshLockState(user);
    try {
      accountLockService.assertCanAuthenticate(fresh);
    } catch (error) {
      if (error instanceof AccountLockError) {
        await accountLockService.logLoginAttempt({
          userId: user.id,
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          deviceLabel,
          isSuccess: false,
          failureReason: error.message,
        });
      }
      throw error;
    }

    await accountLockService.logLoginAttempt({
      userId: user.id,
      ipAddress: meta?.ipAddress,
      userAgent: meta?.userAgent,
      deviceLabel,
      isSuccess: true,
    });

    const tokens = await issueTokensForUser(fresh, meta);
    return { user: toPublicUser(fresh), ...tokens };
  },

  async refresh(rawRefreshToken?: string) {
    const raw = rawRefreshToken ?? '';
    if (!raw) throw new Error('MISSING_REFRESH_TOKEN');
    const tokenHash = sha256Hex(raw);
    const row = await refreshTokenRepository.findValidByHash(tokenHash);
    if (!row) throw new Error('INVALID_REFRESH_TOKEN');

    const user = await userRepository.findById(row.user_id);
    if (!user) throw new Error('INVALID_REFRESH_TOKEN');
    const fresh = await accountLockService.refreshLockState(user);
    try {
      accountLockService.assertCanAuthenticate(fresh);
    } catch {
      throw new Error('INVALID_REFRESH_TOKEN');
    }

    await refreshTokenRepository.revokeById(row.id);
    const tokens = await issueTokensForUser(fresh);
    return { user: toPublicUser(user), ...tokens };
  },

  async logout(rawRefreshToken?: string) {
    const raw = rawRefreshToken ?? '';
    if (!raw) throw new Error('MISSING_REFRESH_TOKEN');
    await refreshTokenRepository.revokeByHash(sha256Hex(raw));
    return { ok: true as const };
  },

  async me(userId: number) {
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');
    const fresh = await accountLockService.refreshLockState(user);
    accountLockService.assertCanAuthenticate(fresh);
    const permissions = await permissionRepository.getUserPermissionCodes(userId);
    return { ...toPublicUser(fresh), permissions };
  },

  async changePassword(
    userId: number,
    body: { currentPassword?: string; newPassword?: string },
  ) {
    assertPassword(body.newPassword ?? '');
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    const ok = await bcrypt.compare(body.currentPassword ?? '', user.password_hash);
    if (!ok) throw new Error('INVALID_CREDENTIALS');

    const passwordHash = await bcrypt.hash(body.newPassword ?? '', authConfig.bcryptRounds);
    await userRepository.updatePasswordHash(userId, passwordHash);
    await refreshTokenRepository.revokeAllForUser(userId);
    return { ok: true as const };
  },

  async forgotPassword(body: { email?: string }) {
    const email = (body.email ?? '').trim();
    if (!email) throw new Error('INVALID_EMAIL');

    const user = await userRepository.findByEmail(email);
    const genericMessage =
      'If an account exists for this email, password reset instructions have been sent.';

    if (!user || !user.is_active) {
      return { message: genericMessage };
    }

    const raw = randomOpaqueToken();
    const tokenHash = sha256Hex(raw);
    const expiresAt = new Date(Date.now() + parseDurationToMs(authConfig.passwordResetExpiresIn));
    await passwordResetRepository.insert(user.id, tokenHash, expiresAt);

    const resetUrl = `${authConfig.appPublicUrl.replace(/\/$/, '')}/reset-password?token=${raw}`;
    await sendMail({
      to: user.email,
      subject: 'Password reset',
      text: `Reset your password by opening: ${resetUrl}\nThis link will expire soon.`,
      html: `<p>Reset your password by <a href="${resetUrl}">clicking here</a>.</p>`,
    });

    return { message: genericMessage };
  },

  async resetPassword(body: { token?: string; newPassword?: string }) {
    assertPassword(body.newPassword ?? '');
    const raw = body.token ?? '';
    if (!raw) throw new Error('MISSING_RESET_TOKEN');

    const tokenHash = sha256Hex(raw);
    const row = await passwordResetRepository.findValidByHash(tokenHash);
    if (!row) throw new Error('INVALID_RESET_TOKEN');

    const user = await userRepository.findById(row.user_id);
    if (!user) throw new Error('USER_NOT_FOUND');

    const passwordHash = await bcrypt.hash(body.newPassword ?? '', authConfig.bcryptRounds);
    await userRepository.updatePasswordHash(user.id, passwordHash);
    await passwordResetRepository.markUsed(row.id);
    await refreshTokenRepository.revokeAllForUser(user.id);
    return { ok: true as const };
  },
};
