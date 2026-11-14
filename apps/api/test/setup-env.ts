/**
 * Environment for e2e tests. Tests run against a dedicated database
 * (TEST_DATABASE_URL) so they never touch development data.
 */
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://realestate:realestate@localhost:5432/realestate_test?schema=public';
process.env.CORS_ORIGINS ??= 'http://localhost:3000';
process.env.WEB_APP_URL ??= 'http://localhost:3000';
