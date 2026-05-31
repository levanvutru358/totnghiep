import { authService } from './auth.service';
import { userRepository } from '../repositories/user.repository';

const MAX_FULL_NAME_LEN = 120;

const normalizeFullName = (value: unknown): string | null => {
  if (value === null) return null;
  if (typeof value !== 'string') throw new Error('INVALID_FULL_NAME');
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.length > MAX_FULL_NAME_LEN) throw new Error('INVALID_FULL_NAME');
  return trimmed;
};

export const userService = {
  async updateMe(userId: number, body: { fullName?: unknown }) {
    if (body.fullName === undefined) throw new Error('NO_UPDATABLE_FIELDS');

    const fullName = normalizeFullName(body.fullName);
    const user = await userRepository.findById(userId);
    if (!user) throw new Error('USER_NOT_FOUND');

    await userRepository.updateProfile(userId, { fullName });
    return authService.me(userId);
  },
};
