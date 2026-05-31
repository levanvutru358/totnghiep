import jwt, { type SignOptions } from 'jsonwebtoken';
import { authConfig } from '../configs/auth.config';
import type { UserRole } from '../constants/roles';

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export const signAccessToken = (userId: number, email: string, role: UserRole): string => {
  const payload: AccessTokenPayload = {
    sub: String(userId),
    email,
    role,
  };
  return jwt.sign(payload, authConfig.jwtAccessSecret, {
    expiresIn: authConfig.jwtAccessExpiresIn,
  } as SignOptions);
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, authConfig.jwtAccessSecret) as AccessTokenPayload;
};
