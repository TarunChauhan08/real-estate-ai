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
process.env.JWT_ACCESS_SECRET ??= 'test-only-secret-not-for-production-0123456789';
// Generous limits so functional tests are not throttled; rate limiting has its own test.
// Assigned (not `??=`) so values exported from a shell or CI `.env` cannot throttle the suite,
// and so a lower limit set by one test file never leaks into the next.
process.env.RATE_LIMIT_MAX = '10000';
process.env.AUTH_RATE_LIMIT_MAX = '10000';
process.env.INVITATION_DELIVERY ??= 'dev_link';
// The AI must never call a paid API from tests, and WhatsApp must never send real messages.
process.env.LLM_PROVIDER = 'fake';
process.env.WHATSAPP_PROVIDER = 'fake';
process.env.WHATSAPP_APP_SECRET = 'test-whatsapp-app-secret';
process.env.WHATSAPP_VERIFY_TOKEN = 'test-whatsapp-verify-token';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 42).toString('base64');
// Short, so a burst of webhooks sent together in a test is still answered once.
process.env.WHATSAPP_REPLY_DEBOUNCE_MS = '150';
