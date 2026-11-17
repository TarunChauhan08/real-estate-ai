import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
  WEB_APP_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
};
const KEY = Buffer.alloc(32, 7).toString('base64');
const production = {
  ...valid,
  NODE_ENV: 'production',
  COOKIE_SECURE: 'true',
  DATA_ENCRYPTION_KEY: KEY,
  MAIL_PROVIDER: 'resend',
  RESEND_API_KEY: 're_test_key',
};

describe('validateEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = validateEnv(valid);
    expect(env.API_PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://app.example.com']);
    expect(env.JWT_ACCESS_TTL_SECONDS).toBe(900);
    expect(env.COOKIE_SECURE).toBe(false);
    expect(env.COOKIE_DOMAIN).toBeUndefined();
  });

  it('rejects a missing DATABASE_URL without echoing values', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => validateEnv(rest)).toThrow(/DATABASE_URL/);
    expect(() =>
      validateEnv({ ...rest, JWT_ACCESS_SECRET: 'super-secret-value-that-is-long-enough' }),
    ).not.toThrow(/super-secret/);
  });

  it('rejects a short JWT secret', () => {
    expect(() => validateEnv({ ...valid, JWT_ACCESS_SECRET: 'short' })).toThrow(
      /JWT_ACCESS_SECRET/,
    );
  });

  it('requires secure cookies and a real secret in production', () => {
    expect(() =>
      validateEnv({
        ...valid,
        NODE_ENV: 'production',
        JWT_ACCESS_SECRET: 'replace-with-' + 'x'.repeat(40),
      }),
    ).toThrow(/COOKIE_SECURE[\s\S]*JWT_ACCESS_SECRET/);
    expect(() => validateEnv(production)).not.toThrow();
  });

  it('forbids returning invitation links in production', () => {
    expect(() => validateEnv({ ...production, INVITATION_DELIVERY: 'dev_link' })).toThrow(
      /INVITATION_DELIVERY/,
    );
  });

  it('defaults to the offline fake AI provider and requires a key for Anthropic', () => {
    expect(validateEnv(valid).LLM_PROVIDER).toBe('fake');
    expect(() => validateEnv({ ...valid, LLM_PROVIDER: 'anthropic' })).toThrow(/ANTHROPIC_API_KEY/);
    expect(
      validateEnv({ ...valid, LLM_PROVIDER: 'anthropic', ANTHROPIC_API_KEY: 'k' }).ANTHROPIC_MODEL,
    ).toBe('claude-sonnet-5-5');
  });

  it('requires a 32-byte encryption key in production', () => {
    const { DATA_ENCRYPTION_KEY: _omit, ...withoutKey } = production;
    expect(() => validateEnv(withoutKey)).toThrow(/DATA_ENCRYPTION_KEY/);
    expect(() => validateEnv({ ...valid, DATA_ENCRYPTION_KEY: 'dG9vLXNob3J0' })).toThrow(
      /DATA_ENCRYPTION_KEY/,
    );
  });

  it('defaults to the fake WhatsApp provider and requires Meta secrets for the Cloud API', () => {
    const env = validateEnv(valid);
    expect(env.WHATSAPP_PROVIDER).toBe('fake');
    expect(env.WHATSAPP_GRAPH_API_VERSION).toBe('v26.0');
    expect(() => validateEnv({ ...valid, WHATSAPP_PROVIDER: 'cloud' })).toThrow(
      /WHATSAPP_APP_SECRET[\s\S]*WHATSAPP_VERIFY_TOKEN/,
    );
    expect(() =>
      validateEnv({
        ...valid,
        WHATSAPP_PROVIDER: 'cloud',
        WHATSAPP_APP_SECRET: 'app-secret',
        WHATSAPP_VERIFY_TOKEN: 'short',
      }),
    ).toThrow(/WHATSAPP_VERIFY_TOKEN/);
    expect(() =>
      validateEnv({
        ...valid,
        WHATSAPP_PROVIDER: 'cloud',
        WHATSAPP_APP_SECRET: 'app-secret',
        WHATSAPP_VERIFY_TOKEN: 'a-long-random-verify-token',
      }),
    ).not.toThrow();
  });

  it('needs a Resend key for Resend, and real email in production', () => {
    expect(() => validateEnv({ ...valid, MAIL_PROVIDER: 'resend' })).toThrow(/RESEND_API_KEY/);
    expect(() => validateEnv({ ...production, MAIL_PROVIDER: 'fake' })).toThrow(/MAIL_PROVIDER/);
    expect(validateEnv(valid).MAIL_PROVIDER).toBe('fake');
  });
});
