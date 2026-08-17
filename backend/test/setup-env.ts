import 'dotenv/config';

// Tests use an isolated SQLite file so they never mutate the developer database.
// The DATABASE_URL should be passed via environment variable (cross-env in package.json).
// Only set defaults if not already provided.
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'file:./test-default.db';
}

if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret';
}

if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret';
}
