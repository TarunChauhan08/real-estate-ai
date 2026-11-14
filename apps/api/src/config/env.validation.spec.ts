import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
  WEB_APP_URL: 'http://localhost:3000',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
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
    expect(() =>
      validateEnv({ ...valid, NODE_ENV: 'production', COOKIE_SECURE: 'true' }),
    ).not.toThrow();
  });

  it('forbids returning invitation links in production', () => {
    expect(() =>
      validateEnv({
        ...valid,
        NODE_ENV: 'production',
        COOKIE_SECURE: 'true',
        INVITATION_DELIVERY: 'dev_link',
      }),
    ).toThrow(/INVITATION_DELIVERY/);
  });
});
