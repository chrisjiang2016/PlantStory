import 'dotenv/config';

// Test execution is routed through scripts/run-tests.js, which copies the
// explicit TEST_DATABASE_URL into DATABASE_URL. There is intentionally no
// SQLite or development-database fallback here: Prisma schema changes can use
// `db push --accept-data-loss`, so an implicit URL would be unsafe.
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL is missing. Run tests through npm test with TEST_DATABASE_URL set.',
  );
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
}
