import { createHash, randomBytes } from 'crypto';

export const randomOpaqueToken = (): string => randomBytes(32).toString('hex');

export const sha256Hex = (value: string): string =>
  createHash('sha256').update(value, 'utf8').digest('hex');
