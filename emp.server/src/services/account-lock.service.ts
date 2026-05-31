import { loginLogRepository } from '../repositories/login-log.repository';
import { userRepository, type UserRow } from '../repositories/user.repository';

export class AccountLockError extends Error {
  constructor(
    message: string,
    public lockReason: string | null = null,
    public lockedUntil: Date | null = null,
  ) {
    super(message);
  }
}

export const accountLockService = {
  async refreshLockState(user: UserRow): Promise<UserRow> {
    if (
      user.account_status === 'TEMP_LOCKED' &&
      user.locked_until &&
      new Date(user.locked_until) <= new Date()
    ) {
      await userRepository.unlockAccount(user.id);
      const fresh = await userRepository.findById(user.id);
      if (!fresh) throw new Error('USER_NOT_FOUND');
      return fresh;
    }
    return user;
  },

  assertCanAuthenticate(user: UserRow) {
    if (user.account_status === 'LOCKED') {
      throw new AccountLockError('ACCOUNT_LOCKED', user.lock_reason, null);
    }
    if (user.account_status === 'TEMP_LOCKED') {
      throw new AccountLockError('ACCOUNT_TEMP_LOCKED', user.lock_reason, user.locked_until);
    }
    if (!user.is_active) {
      throw new AccountLockError('ACCOUNT_DISABLED', user.lock_reason, null);
    }
  },

  async logLoginAttempt(input: {
    userId: number;
    ipAddress?: string | null;
    userAgent?: string | null;
    deviceLabel?: string | null;
    isSuccess: boolean;
    failureReason?: string | null;
  }) {
    await loginLogRepository.create(input);
  },
};
