/**
 * Applies all migrations to the isolated test database (TEST_DATABASE_URL).
 * Used by `pnpm db:test:prepare` and as Jest's e2e globalSetup.
 */
const { execSync } = require('node:child_process');
const path = require('node:path');

const DEFAULT_TEST_URL =
  'postgresql://realestate:realestate@localhost:5432/realestate_test?schema=public';

function prepareTestDatabase() {
  const url = process.env.TEST_DATABASE_URL || DEFAULT_TEST_URL;
  if (!/test/i.test(url)) {
    throw new Error(
      'Refusing to migrate: TEST_DATABASE_URL must point at a database whose name contains "test".',
    );
  }
  execSync('npx prisma migrate deploy', {
    cwd: path.resolve(__dirname, '..'),
    env: { ...process.env, DATABASE_URL: url },
    stdio: process.env.CI ? 'inherit' : 'pipe',
  });
}

module.exports = prepareTestDatabase;

if (require.main === module) {
  prepareTestDatabase();
  console.log('Test database is migrated.');
}
