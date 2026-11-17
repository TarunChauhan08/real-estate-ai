import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

describe('AI usage summary (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('is empty for a new business, with one entry per day', async () => {
    const res = await http().get('/api/v1/dashboard/ai-usage?days=7').set(bearer(a)).expect(200);
    expect(res.body.data).toMatchObject({
      days: 7,
      replies: 0,
      failedReplies: 0,
      inputTokens: 0,
      outputTokens: 0,
      averageLatencyMs: null,
      languages: {},
    });
    expect(res.body.data.daily).toHaveLength(7);
  });

  it('counts replies, tokens, languages, visits, handoffs and failures for this business only', async () => {
    const chat = await http()
      .post('/api/v1/conversations')
      .set(bearer(a))
      .send({ phone: '98111 22333' })
      .expect(201);
    const id = chat.body.data.id as string;
    const say = (content: string) =>
      http()
        .post(`/api/v1/conversations/${id}/messages`)
        .set(bearer(a))
        .send({ content })
        .expect(200);
    await say('Mujhe Noida mein 2 BHK chahiye, budget 70 lakh hai');
    await say('Kya main Saturday ko visit kar sakta hoon?');
    await say('I want to talk to a manager please');

    await prismaOf(app).auditLog.create({
      data: { tenantId: a.activeTenant!.id, action: 'ai.reply_failed', entityType: 'conversation' },
    });

    const res = await http().get('/api/v1/dashboard/ai-usage').set(bearer(a)).expect(200);
    const usage = res.body.data;
    expect(usage.days).toBe(30);
    expect(usage.replies).toBe(3);
    expect(usage.failedReplies).toBe(1);
    expect(usage.inputTokens).toBeGreaterThan(0);
    expect(usage.outputTokens).toBeGreaterThan(0);
    expect(usage.siteVisitRequests).toBe(1);
    expect(usage.handoffs).toBe(1);
    expect(usage.languages).toEqual({ hinglish: 2, en: 1 });
    expect(usage.daily).toHaveLength(30);
    expect(usage.daily.at(-1).replies).toBe(3);

    const other = await http().get('/api/v1/dashboard/ai-usage').set(bearer(b)).expect(200);
    expect(other.body.data.replies).toBe(0);
    expect(other.body.data.failedReplies).toBe(0);
  });

  it('only accepts 7, 30 or 90 days', async () => {
    await http().get('/api/v1/dashboard/ai-usage?days=12').set(bearer(a)).expect(400);
    await http().get('/api/v1/dashboard/ai-usage?days=abc').set(bearer(a)).expect(400);
  });
});
