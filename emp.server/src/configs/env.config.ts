import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

declare global {
  var __empServerEnvLoaded__: boolean | undefined;
}

const localEnvPath = (): string | undefined => {
  const envPath = path.resolve(process.cwd(), '.env');
  return fs.existsSync(envPath) ? envPath : undefined;
};

const shouldSkipFileEnv = (): boolean => {
  if (process.env.NODE_ENV === 'production') return true;
  // App Platform inject DB_* — không ghi đè bằng file trong repo
  if (process.env.DB_HOST?.trim()) return true;
  return false;
};

export const loadEnv = (): void => {
  if (globalThis.__empServerEnvLoaded__) return;

  if (shouldSkipFileEnv()) {
    globalThis.__empServerEnvLoaded__ = true;
    return;
  }

  const envPath = localEnvPath();
  if (envPath) {
    dotenv.config({ path: envPath });
  }

  globalThis.__empServerEnvLoaded__ = true;
};

loadEnv();
