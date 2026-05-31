import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

declare global {
  var __empServerEnvLoaded__: boolean | undefined;
}

const resolveEnvPath = (): string | undefined => {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) return envPath;

  const examplePath = path.resolve(process.cwd(), '.env.example');
  if (fs.existsSync(examplePath)) return examplePath;

  return undefined;
};

export const loadEnv = (): void => {
  if (globalThis.__empServerEnvLoaded__) return;

  const envPath = resolveEnvPath();
  if (envPath) {
    dotenv.config({ path: envPath });
  } else {
    dotenv.config();
  }

  globalThis.__empServerEnvLoaded__ = true;
};

loadEnv();
