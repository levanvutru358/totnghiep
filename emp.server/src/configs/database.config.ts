import { createPool, Pool } from 'mysql2/promise';
import { loadEnv } from './env.config';

loadEnv();

const DO_PLACEHOLDER_HOSTS = new Set([
    'HOSTNAME',
    'localhost',
    '${dev-db-994302.HOSTNAME}',
]);

const assertDbEnv = (): void => {
    const host = (process.env.DB_HOST ?? '').trim();
    if (!host) return;

    if (DO_PLACEHOLDER_HOSTS.has(host) || /^\$\{/.test(host)) {
        throw new Error(
            `DB_HOST="${host}" không phải hostname MySQL thật. ` +
                'Trên DigitalOcean: xóa DB_* → Add Variable → Add from database → ' +
                'chọn field HOSTNAME (value phải dạng xxx.db.ondigitalocean.com, không gõ chữ HOSTNAME).',
        );
    }

    const portRaw = (process.env.DB_PORT ?? '').trim();
    if (portRaw === 'PORT' || /^\$\{/.test(portRaw)) {
        throw new Error(
            `DB_PORT="${portRaw}" chưa được gán. Dùng Add from database → field PORT (vd 25060).`,
        );
    }
};

assertDbEnv();

interface DatabaseConfig {
    host: string;
    port: number;
    user: string;
    password: string;
    database: string;
    waitForConnections: boolean;
    connectionLimit: number;
    queueLimit: number;
}

const dbConfig: DatabaseConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || '',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ecommerce_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
};

export const pool: Pool = createPool(dbConfig);

export default dbConfig;
