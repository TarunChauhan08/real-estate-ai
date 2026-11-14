import { type INestApplication } from '@nestjs/common';
import request from 'supertest';

describe('Rate limiting (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    // Must be set before the app module (and its validated config) is loaded.
    process.env.AUTH_RATE_LIMIT_MAX = '3';
    const { createTestApp } = await import('./app.factory');
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('throttles repeated login attempts with 429 and the standard error envelope', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'Wr0ng-password' });

    for (let i = 0; i < 3; i += 1) expect((await attempt()).status).toBe(401);
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('RATE_LIMITED');
    expect(blocked.headers['retry-after-strict']).toBeDefined();
  });

  it('does not apply the strict limit to non-credential endpoints', async () => {
    for (let i = 0; i < 5; i += 1) {
      await request(app.getHttpServer()).get('/api/v1/health').expect(200);
    }
  });
});
