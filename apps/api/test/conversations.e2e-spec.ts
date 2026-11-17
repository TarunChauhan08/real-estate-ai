import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

/** Runs against the offline FakeLLMProvider (see setup-env.ts) — no paid API is ever called. */
describe('Conversations with the AI employee (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  let viewer: TestSession;
  let propertyId: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
    viewer = await addMemberAndLogin(app, a.activeTenant!.id, 'VIEWER');
    const property = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send({
        title: '3 BHK Sector 150',
        propertyType: 'APARTMENT',
        price: 8_200_000,
        city: 'Noida',
        bedrooms: 3,
      })
      .expect(201);
    propertyId = property.body.data.id;
  });

  afterAll(async () => {
    await app.close();
  });

  const start = (session: TestSession, body: object) =>
    http().post('/api/v1/conversations').set(bearer(session)).send(body);
  const say = (session: TestSession, id: string, content: string, as?: 'BUYER' | 'AGENT') =>
    http()
      .post(`/api/v1/conversations/${id}/messages`)
      .set(bearer(session))
      .send(as ? { content, as } : { content });

  it('starts a test chat for a new buyer and creates the lead', async () => {
    const res = await start(a, { phone: '98111 22333' }).expect(201);
    expect(res.body.data.channel).toBe('WEB_TEST');
    expect(res.body.data.aiEnabled).toBe(true);
    expect(res.body.data.lead).toMatchObject({ name: 'New buyer', phone: '+919811122333' });
    expect(res.body.data.messages).toEqual([]);
  });

  it('reuses an existing lead with the same phone', async () => {
    const first = await start(a, { phone: '9822233344', name: 'Neha' }).expect(201);
    const second = await start(a, { phone: '+91 98222 33344' }).expect(201);
    expect(second.body.data.lead.id).toBe(first.body.data.lead.id);
    expect(second.body.data.lead.name).toBe('Neha');
  });

  it('replies to the buyer, suggests real inventory and updates the lead profile', async () => {
    const { body } = await start(a, { phone: '9833344455', name: 'Rahul' }).expect(201);
    const id = body.data.id as string;
    const turn = await say(a, id, 'Noida mein 3 BHK chahiye, budget 85 lakh').expect(200);

    expect(turn.body.data.buyerMessage.role).toBe('BUYER');
    expect(turn.body.data.aiMessage.role).toBe('AI');
    expect(turn.body.data.aiMessage.content.length).toBeGreaterThan(0);
    expect(turn.body.data.aiMessage.suggestedPropertyIds).toEqual([propertyId]);
    expect(turn.body.data.aiError).toBeNull();

    const lead = await http().get(`/api/v1/leads/${body.data.lead.id}`).set(bearer(a)).expect(200);
    expect(lead.body.data).toMatchObject({
      budgetMax: 8_500_000,
      preferredCity: 'Noida',
      preferredBedrooms: [3],
      status: 'QUALIFIED',
      preferredLanguage: 'hinglish',
    });
    expect(lead.body.data.lastContactedAt).not.toBeNull();

    const stored = await prismaOf(app).message.findFirstOrThrow({
      where: { conversationId: id, role: 'AI' },
    });
    expect(stored.model).toBe('fake-1');
    expect(stored.metadata).toMatchObject({ provider: 'fake', promptVersion: expect.any(String) });

    const audit = await prismaOf(app).auditLog.findFirst({
      where: { entityId: body.data.lead.id, action: 'lead.updated' },
    });
    expect(audit?.actorId).toBeNull();
    expect(audit?.metadata).toMatchObject({ by: 'ai_employee' });

    const full = await http().get(`/api/v1/conversations/${id}`).set(bearer(a)).expect(200);
    expect(full.body.data.messages.map((m: { role: string }) => m.role)).toEqual(['BUYER', 'AI']);
  });

  it('hands off to a human and then stays silent', async () => {
    const { body } = await start(a, { phone: '9844455566' }).expect(201);
    const id = body.data.id as string;
    const turn = await say(a, id, 'Can I get a discount? I want to talk to a manager').expect(200);
    expect(turn.body.data.handoffRequested).toBe(true);

    const after = await http().get(`/api/v1/conversations/${id}`).set(bearer(a)).expect(200);
    expect(after.body.data.aiEnabled).toBe(false);
    expect(after.body.data.messages.at(-1).role).toBe('SYSTEM');

    const quiet = await say(a, id, 'Hello?').expect(200);
    expect(quiet.body.data.aiMessage).toBeNull();

    const agent = await say(a, id, 'Hi, this is Priya from the sales team.', 'AGENT').expect(200);
    expect(agent.body.data.buyerMessage.role).toBe('AGENT');
    expect(agent.body.data.aiMessage).toBeNull();

    await http()
      .patch(`/api/v1/conversations/${id}`)
      .set(bearer(a))
      .send({ aiEnabled: true })
      .expect(200);
    const back = await say(a, id, '2 BHK in Pune').expect(200);
    expect(back.body.data.aiMessage).not.toBeNull();
  });

  it('rejects messages to a closed conversation and validates input', async () => {
    const { body } = await start(a, { phone: '9855566677' }).expect(201);
    const id = body.data.id as string;
    await say(a, id, '   ').expect(400);
    await http()
      .patch(`/api/v1/conversations/${id}`)
      .set(bearer(a))
      .send({ status: 'CLOSED' })
      .expect(200);
    const closed = await say(a, id, 'hello').expect(409);
    expect(closed.body.error.code).toBe('CONVERSATION_CLOSED');
    await start(a, {}).expect(400);
  });

  it('lists conversations by recent activity', async () => {
    const res = await http().get('/api/v1/conversations?pageSize=50').set(bearer(a)).expect(200);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    const first = res.body.data[0];
    expect(first.lead).toHaveProperty('name');
  });

  it('keeps conversations isolated between businesses', async () => {
    const { body } = await start(a, { phone: '9866677788' }).expect(201);
    const id = body.data.id as string;
    await http().get(`/api/v1/conversations/${id}`).set(bearer(b)).expect(404);
    await say(b, id, 'hijack').expect(404);
    await http()
      .patch(`/api/v1/conversations/${id}`)
      .set(bearer(b))
      .send({ aiEnabled: false })
      .expect(404);
    const list = await http().get('/api/v1/conversations?pageSize=100').set(bearer(b)).expect(200);
    expect(list.body.data).toEqual([]);
    const lead = await prismaOf(app).lead.findFirstOrThrow({
      where: { tenantId: a.activeTenant!.id },
    });
    await start(b, { leadId: lead.id }).expect(404);

    // B's AI must never see A's inventory.
    const chat = await start(b, { phone: '9877788899' }).expect(201);
    const turn = await say(b, chat.body.data.id, 'Noida 3 BHK 85 lakh').expect(200);
    expect(turn.body.data.aiMessage.suggestedPropertyIds).toEqual([]);
  });

  it('viewers can read but not chat', async () => {
    await http().get('/api/v1/conversations').set(bearer(viewer)).expect(200);
    await start(viewer, { phone: '9888899900' }).expect(403);
  });
});
