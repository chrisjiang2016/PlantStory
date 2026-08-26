#!/usr/bin/env node

/**
 * PostgreSQL-safe Jest runner.
 *
 * Tests deliberately require TEST_DATABASE_URL rather than falling back to
 * DATABASE_URL. This prevents `prisma db push --accept-data-loss` from ever
 * targeting a developer or production database by accident.
 */
const { spawnSync } = require('node:child_process');

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const configuredDatabaseUrl = process.env.DATABASE_URL;

if (configuredDatabaseUrl && configuredDatabaseUrl === testDatabaseUrl) {
  console.error(
    'DATABASE_URL and TEST_DATABASE_URL must be different environment variables. Use TEST_DATABASE_URL only when running tests.',
  );
  process.exit(1);
}

if (!testDatabaseUrl) {
  console.error(
    'TEST_DATABASE_URL is required. It must point to a dedicated PostgreSQL test database.',
  );
  console.error(
    'Example: postgresql://plant_story_test:plant_story_test@localhost:5433/plant_story_test?schema=public',
  );
  process.exit(1);
}

if (!/^postgres(?:ql)?:\/\//i.test(testDatabaseUrl)) {
  console.error('TEST_DATABASE_URL must use a postgresql:// or postgres:// URL.');
  process.exit(1);
}

const environment = {
  ...process.env,
  DATABASE_URL: testDatabaseUrl,
  NODE_ENV: 'test',
  JWT_SECRET: process.env.JWT_SECRET || 'test-secret',
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
};

const prisma = spawnSync('npx', ['prisma', 'db', 'push', '--accept-data-loss'], {
  stdio: 'inherit',
  env: environment,
  shell: process.platform === 'win32',
});

if (prisma.status !== 0) {
  process.exit(prisma.status || 1);
}

const jestArgs = ['jest', '--runInBand', ...process.argv.slice(2)];
const jest = spawnSync('npx', jestArgs, {
  stdio: 'inherit',
  env: environment,
  shell: process.platform === 'win32',
});

process.exit(jest.status || 0);
