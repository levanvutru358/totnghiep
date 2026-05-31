import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { pool } from '../configs/database.config';

interface MigrationFile {
  id: string;
  fileName: string;
  fullPath: string;
}

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

const toIdFromFileName = (fileName: string): string => fileName.replace(/\.up\.sql$/i, '');

const checksum = (content: string): string => createHash('sha256').update(content).digest('hex');

const splitSqlStatements = (sql: string): string[] => {
  const sqlWithoutLineComments = sql
    .split('\n')
    .filter((line) => !line.trim().startsWith('--'))
    .join('\n');

  return sqlWithoutLineComments
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement.length > 0);
};

const ensureMigrationTable = async (): Promise<void> => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id VARCHAR(255) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
};

const getUpMigrations = async (): Promise<MigrationFile[]> => {
  try {
    const files = await fs.readdir(MIGRATIONS_DIR);
    return files
      .filter((file) => file.toLowerCase().endsWith('.up.sql'))
      .sort((a, b) => a.localeCompare(b))
      .map((fileName) => ({
        id: toIdFromFileName(fileName),
        fileName,
        fullPath: path.join(MIGRATIONS_DIR, fileName),
      }));
  } catch (error: unknown) {
    // Missing folder means no migrations yet.
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
};

export const runMigrations = async (): Promise<void> => {
  await ensureMigrationTable();

  const [rows] = await pool.query('SELECT id, checksum FROM schema_migrations');
  const applied = new Map<string, string>();
  (rows as Array<{ id: string; checksum: string }>).forEach((row) => {
    applied.set(row.id, row.checksum);
  });

  const migrations = await getUpMigrations();
  if (migrations.length === 0) {
    console.log('ℹ️  No migrations found');
    return;
  }

  for (const migration of migrations) {
    const sql = await fs.readFile(migration.fullPath, 'utf8');
    const sqlChecksum = checksum(sql);
    const existingChecksum = applied.get(migration.id);

    if (existingChecksum) {
      if (existingChecksum !== sqlChecksum) {
        throw new Error(
          `Migration checksum mismatch for "${migration.fileName}". Do not edit applied migrations.`,
        );
      }
      continue;
    }

    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const statements = splitSqlStatements(sql);
      for (const statement of statements) {
        await connection.query(statement);
      }
      await connection.query('INSERT INTO schema_migrations (id, checksum) VALUES (?, ?)', [
        migration.id,
        sqlChecksum,
      ]);
      await connection.commit();
      console.log(`✅ Migration applied: ${migration.fileName}`);
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
};

