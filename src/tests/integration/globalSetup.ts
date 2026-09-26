import { execSync } from 'child_process';
import { Client } from 'pg';

/**
 * Runs once before the whole test suite: makes sure the dedicated test
 * database exists and has all migrations (incl. views) applied.
 */
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

const ensureDatabaseExists = async (databaseUrl: string) => {
    const url = new URL(databaseUrl);
    const dbName = url.pathname.replace(/^\//, '');
    const adminUrl = new URL(databaseUrl);
    adminUrl.pathname = '/postgres';

    const client = new Client({ connectionString: adminUrl.toString() });
    await client.connect();
    try {
        const { rowCount } = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
        if (rowCount === 0) {
            await client.query(`CREATE DATABASE "${dbName}"`);
        }
    } finally {
        await client.end();
    }
};

export default async function globalSetup() {
    if (!TEST_DATABASE_URL) {
        throw new Error('TEST_DATABASE_URL (or DATABASE_URL) must be set to run the integration tests');
    }
    await ensureDatabaseExists(TEST_DATABASE_URL);
    execSync('yarn prisma migrate deploy', {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL }
    });
}
