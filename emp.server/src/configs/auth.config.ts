const requiredInProd = (name: string, fallback: string): string => {
  const v = process.env[name];
  if (v && v.length > 0) return v;
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return fallback;
};

const parseSameSite = (value?: string): 'lax' | 'strict' | 'none' => {
  const normalized = (value ?? 'lax').toLowerCase();
  if (normalized === 'strict' || normalized === 'none') return normalized;
  return 'lax';
};

export const authConfig = {
  jwtAccessSecret: requiredInProd('JWT_ACCESS_SECRET', 'dev-only-jwt-access-secret-change-me'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 10),
  passwordResetExpiresIn: process.env.PASSWORD_RESET_EXPIRES_IN ?? '1h',
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:5173',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'refreshToken',
  refreshCookiePath: process.env.REFRESH_COOKIE_PATH ?? '/api/auth',
  refreshCookieSecure: (process.env.REFRESH_COOKIE_SECURE ?? 'false') === 'true',
  refreshCookieSameSite: parseSameSite(process.env.REFRESH_COOKIE_SAMESITE),
};
