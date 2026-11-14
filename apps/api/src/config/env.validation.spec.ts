import { validateEnv } from './env.validation';

const valid = {
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  CORS_ORIGINS: 'http://localhost:3000, https://app.example.com',
  WEB_APP_URL: 'http://localhost:3000',
};

describe('validateEnv', () => {
  it('parses a valid environment and applies defaults', () => {
    const env = validateEnv(valid);
    expect(env.API_PORT).toBe(4000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual(['http://localhost:3000', 'https://app.example.com']);
  });

  it('rejects a missing DATABASE_URL without echoing values', () => {
    const { DATABASE_URL: _omit, ...rest } = valid;
    expect(() => validateEnv({ ...rest, SECRET_THING: 'super-secret' })).toThrow(/DATABASE_URL/);
    expect(() => validateEnv(rest)).not.toThrow(/super-secret/);
  });
});
