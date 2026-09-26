import { defineConfig } from 'vitest/config';

// integration tests run against a dedicated database (TEST_DATABASE_URL) so the
// development database is never touched by the test suite.
const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['src/tests/**/*.test.ts'],
        globalSetup: ['./src/tests/integration/globalSetup.ts'],
        setupFiles: ['./src/tests/integration/setup.ts'],
        // the tests share one database, so they must not run in parallel
        fileParallelism: false,
        testTimeout: 20_000,
        hookTimeout: 30_000,
        env: {
            NODE_ENV: 'test',
            DATABASE_URL: testDatabaseUrl
        }
    }
});
