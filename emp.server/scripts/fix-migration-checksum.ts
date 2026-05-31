import { promises as fs } from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { pool } from '../src/configs/database.config';

const migrationId = process.argv[2] ?? '030_product_images';
const fileName = `${migrationId}.up.sql`;
const filePath = path.join(process.cwd(), 'src', 'db', 'migrations', fileName);

const run = async () => {
  const sql = await fs.readFile(filePath, 'utf8');
  const hash = createHash('sha256').update(sql).digest('hex');
  const [result] = await pool.query('UPDATE schema_migrations SET checksum = ? WHERE id = ?', [
    hash,
    migrationId,
  ]);
  console.log(`Updated checksum for ${migrationId}: ${hash}`);
  console.log('Affected rows:', (result as { affectedRows?: number }).affectedRows);
  await pool.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
