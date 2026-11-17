import { createHmac } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type FakeWhatsAppClient } from '../src/modules/whatsapp/client/fake.client';
import { WHATSAPP_CLIENT } from '../src/modules/whatsapp/client/whatsapp-client';
import { WhatsAppInboundService } from '../src/modules/whatsapp-webhook/whatsapp-inbound.service';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

/**
 * The WhatsApp channel end to end: connection settings, Meta's webhook (handshake, signatures,
 * messages, retries, delivery statuses), AI replies sent back to the buyer, team replies and the
 * 24-hour rule. Runs on the fake WhatsApp client and fake AI — nothing leaves the machine.
 */
describe('WhatsApp channel (e2e)', () => {
  const APP_SECRET = 'test-whatsapp-app-secret';
  const VERIFY_TOKEN = 'test-whatsapp-verify-token';
  const A_NUMBER_ID = '100000000000001';
  const B_NUMBER_ID = '200000000000002';
  const TOKEN = 'EAAG-super-secret-system-user-token';

  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  let agent: TestSession;
  let wa: FakeWhatsAppClient;
  let seq = 0;
  const http = () => request(app.getHttpServer());

  const connect = (session: TestSession, body: Record<string, unknown>) =>
    http().put('/api/v1/channels/whatsapp').set(bearer(session)).send(body);

  /** POSTs a correctly signed Meta webhook and waits for background processing (AI + send). */
  async function deliverWebhook(body: unknown, signWith = APP_SECRET) {
    const raw = JSON.stringify(body);
    const signature = `sha256=${createHmac('sha256', signWith).update(raw).digest('hex')}`;
    const res = await http()
      .post('/api/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set('x-hub-signature-256', signature)
      .send(raw);
    await app.get(WhatsAppInboundService).whenIdle();
    return res;
  }

  function messageBody(
    phoneNumberId: string,
    from: string,
    text: string,
    options: { id?: string; name?: string } = {},
  ) {
    seq += 1;
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA',
          changes: [
            {
              field: 'messages',
              value: {
                messaging_product: 'whatsapp',
                metadata: { display_phone_number: '911234567890', phone_number_id: phoneNumberId },
                contacts: options.name ? [{ profile: { name: options.name }, wa_id: from }] : [],
                messages: [
                  {
                    from,
                    id: options.id ?? `wamid.test-${seq}`,
                    timestamp: String(Math.floor(Date.now() / 1000)),
                    type: 'text',
                    text: { body: text },
                  },
                ],
              },
            },
          ],
        },
      ],
    };
  }

  function statusBody(phoneNumberId: string, externalId: string, status: string) {
    return {
      object: 'whatsapp_business_account',
      entry: [
        {
          id: 'WABA',
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: phoneNumberId },
                statuses: [{ id: externalId, status, timestamp: String(Date.now() / 1000) }],
              },
            },
          ],
        },
      ],
    };
  }

  const conversationsOf = (session: TestSession) =>
    http().get('/api/v1/conversations?channel=WHATSAPP').set(bearer(session)).expect(200);
  const conversation = (session: TestSession, id: string) =>
    http().get(`/api/v1/conversations/${id}`).set(bearer(session)).expect(200);

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    wa = app.get<FakeWhatsAppClient>(WHATSAPP_CLIENT);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
    agent = await addMemberAndLogin(app, a.activeTenant!.id, 'SALES_AGENT');
    await http()
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
  });

  beforeEach(() => wa.reset());

  afterAll(async () => {
    await app.close();
  });

  describe('connection settings', () => {
    it('starts disconnected, in demo mode with the simulator available', async () => {
      const res = await http().get('/api/v1/channels/whatsapp').set(bearer(a)).expect(200);
      expect(res.body.data).toEqual({ provider: 'fake', account: null, simulatorEnabled: true });
    });

    it('only owners and admins can connect a number', async () => {
      await connect(agent, {
        phoneNumberId: A_NUMBER_ID,
        displayPhoneNumber: '98100 00001',
        accessToken: TOKEN,
      }).expect(403);
    });

    it('rejects a token WhatsApp does not accept', async () => {
      const res = await connect(a, {
        phoneNumberId: A_NUMBER_ID,
        displayPhoneNumber: '98100 00001',
        accessToken: 'invalid-token',
      }).expect(400);
      expect(res.body.error.code).toBe('WHATSAPP_VERIFICATION_FAILED');
    });

    it('validates the Meta IDs and phone number', async () => {
      const res = await connect(a, {
        phoneNumberId: 'abc',
        displayPhoneNumber: '12',
        accessToken: 'has spaces in it',
      }).expect(400);
      const fields = (res.body.error.details as Array<{ field: string }>).map((d) => d.field);
      expect(fields).toEqual(
        expect.arrayContaining(['phoneNumberId', 'displayPhoneNumber', 'accessToken']),
      );
    });

    it('connects, stores the token encrypted and never returns it', async () => {
      const res = await connect(a, {
        phoneNumberId: A_NUMBER_ID,
        wabaId: '300000000000003',
        displayPhoneNumber: '98100 00001',
        accessToken: TOKEN,
      }).expect(200);
      expect(res.body.data.account).toMatchObject({
        phoneNumberId: A_NUMBER_ID,
        wabaId: '300000000000003',
        displayPhoneNumber: '+919810000001',
        lastInboundAt: null,
      });
      expect(JSON.stringify(res.body)).not.toContain(TOKEN);

      const row = await prismaOf(app).whatsAppAccount.findUniqueOrThrow({
        where: { phoneNumberId: A_NUMBER_ID },
      });
      expect(row.accessTokenEncrypted.startsWith('v1:')).toBe(true);
      expect(row.accessTokenEncrypted).not.toContain(TOKEN);

      const audit = await prismaOf(app).auditLog.findFirst({
        where: { tenantId: a.activeTenant!.id, action: 'whatsapp.connected' },
      });
      expect(JSON.stringify(audit?.metadata)).not.toContain(TOKEN);
    });

    it('refuses to connect a number that already belongs to another business', async () => {
      const res = await connect(b, {
        phoneNumberId: A_NUMBER_ID,
        displayPhoneNumber: '98100 00009',
        accessToken: TOKEN,
      }).expect(409);
      expect(res.body.error.code).toBe('WHATSAPP_NUMBER_IN_USE');
      await connect(b, {
        phoneNumberId: B_NUMBER_ID,
        displayPhoneNumber: '98100 00002',
        accessToken: `${TOKEN}-b`,
      }).expect(200);
    });
  });

  describe('webhook security', () => {
    it('completes Meta’s subscription handshake only with the right verify token', async () => {
      const ok = await http()
        .get('/api/v1/webhooks/whatsapp')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': VERIFY_TOKEN,
          'hub.challenge': '1158201444',
        })
        .expect(200);
      expect(ok.text).toBe('1158201444');
      expect(ok.headers['content-type']).toMatch(/text\/plain/);

      await http()
        .get('/api/v1/webhooks/whatsapp')
        .query({ 'hub.mode': 'subscribe', 'hub.verify_token': 'wrong-token', 'hub.challenge': '1' })
        .expect(403);
    });

    it('rejects unsigned or wrongly signed webhooks and stores nothing', async () => {
      const body = messageBody(A_NUMBER_ID, '919700000001', 'forged message');
      await http().post('/api/v1/webhooks/whatsapp').send(body).expect(401);
      const forged = await deliverWebhook(body, 'not-the-app-secret');
      expect(forged.status).toBe(401);
      const count = await prismaOf(app).message.count({ where: { content: 'forged message' } });
      expect(count).toBe(0);
    });

    it('acknowledges events for unknown numbers without creating anything', async () => {
      const res = await deliverWebhook(messageBody('999999999999999', '919700000002', 'hello?'));
      expect(res.status).toBe(200);
      expect(await prismaOf(app).message.count({ where: { content: 'hello?' } })).toBe(0);
    });
  });

  describe('a buyer messages the business', () => {
    let conversationId: string;

    it('creates the lead and conversation, and the AI replies on WhatsApp', async () => {
      const res = await deliverWebhook(
        messageBody(A_NUMBER_ID, '919811100001', 'Hi, Noida mein 3 BHK chahiye. Budget 85 lakh.', {
          id: 'wamid.first',
          name: 'Priya Verma',
        }),
      );
      expect(res.status).toBe(200);

      const list = await conversationsOf(a);
      expect(list.body.data).toHaveLength(1);
      const summary = list.body.data[0];
      conversationId = summary.id;
      expect(summary).toMatchObject({
        channel: 'WHATSAPP',
        status: 'OPEN',
        aiEnabled: true,
        lead: { name: 'Priya Verma', phone: '+919811100001' },
      });
      expect(new Date(summary.replyWindowEndsAt).getTime()).toBeGreaterThan(
        Date.now() + 23 * 3600_000,
      );

      const detail = await conversation(a, conversationId);
      const [buyer, ai] = detail.body.data.messages;
      expect(buyer).toMatchObject({ role: 'BUYER', deliveryStatus: null });
      expect(ai).toMatchObject({ role: 'AI', deliveryStatus: 'SENT', deliveryError: null });

      // The reply really went out to the buyer's number from the business's number.
      expect(wa.sent).toHaveLength(1);
      expect(wa.sent[0]).toMatchObject({
        phoneNumberId: A_NUMBER_ID,
        to: '+919811100001',
        body: ai.content,
      });
      expect(wa.read).toEqual(['wamid.first']);

      const lead = await prismaOf(app).lead.findFirstOrThrow({ where: { phone: '+919811100001' } });
      expect(lead).toMatchObject({ source: 'WHATSAPP', preferredCity: 'Noida' });
      const account = await prismaOf(app).whatsAppAccount.findUniqueOrThrow({
        where: { phoneNumberId: A_NUMBER_ID },
      });
      expect(account.lastInboundAt).not.toBeNull();
    });

    it('ignores Meta re-sending the same message', async () => {
      await deliverWebhook(
        messageBody(A_NUMBER_ID, '919811100001', 'Hi, Noida mein 3 BHK chahiye. Budget 85 lakh.', {
          id: 'wamid.first',
        }),
      );
      const detail = await conversation(a, conversationId);
      expect(detail.body.data.messages).toHaveLength(2);
      expect(wa.sent).toHaveLength(0);
    });

    it('keeps one thread per buyer and tracks delivery statuses forward only', async () => {
      await deliverWebhook(messageBody(A_NUMBER_ID, '919811100001', 'Ready to move hona chahiye'));
      expect((await conversationsOf(a)).body.data).toHaveLength(1);
      const sentId = wa.sent[0]!.externalId;

      await deliverWebhook(statusBody(A_NUMBER_ID, sentId, 'delivered'));
      await deliverWebhook(statusBody(A_NUMBER_ID, sentId, 'read'));
      await deliverWebhook(statusBody(A_NUMBER_ID, sentId, 'delivered')); // late, out of order
      const messages = (await conversation(a, conversationId)).body.data.messages;
      expect(messages.at(-1)).toMatchObject({ role: 'AI', deliveryStatus: 'READ' });
    });

    it('a status webhook from another business’s number cannot touch these messages', async () => {
      const ai = await prismaOf(app).message.findFirstOrThrow({
        where: { conversationId, role: 'AI', deliveryStatus: 'SENT' },
      });
      await deliverWebhook(statusBody(B_NUMBER_ID, ai.externalId!, 'failed'));
      const after = await prismaOf(app).message.findUniqueOrThrow({ where: { id: ai.id } });
      expect(after.deliveryStatus).toBe('SENT');
    });

    it('answers a burst of messages once, after the last one', async () => {
      const body = messageBody(A_NUMBER_ID, '919811100001', 'Sector 150');
      const second = messageBody(A_NUMBER_ID, '919811100001', 'ya 137');
      const raw = [JSON.stringify(body), JSON.stringify(second)];
      await Promise.all(
        raw.map((r) =>
          http()
            .post('/api/v1/webhooks/whatsapp')
            .set('content-type', 'application/json')
            .set(
              'x-hub-signature-256',
              `sha256=${createHmac('sha256', APP_SECRET).update(r).digest('hex')}`,
            )
            .send(r)
            .expect(200),
        ),
      );
      await app.get(WhatsAppInboundService).whenIdle();
      expect(wa.sent).toHaveLength(1);
    });

    it('stays silent while the team has paused the AI, and the team can reply on WhatsApp', async () => {
      await http()
        .patch(`/api/v1/conversations/${conversationId}`)
        .set(bearer(agent))
        .send({ aiEnabled: false })
        .expect(200);
      await deliverWebhook(messageBody(A_NUMBER_ID, '919811100001', 'Can someone call me?'));
      expect(wa.sent).toHaveLength(0);

      const reply = await http()
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(bearer(agent))
        .send({
          content: 'Hi Priya, this is Rohan from A Realty. Calling you in 10 minutes.',
          as: 'AGENT',
        })
        .expect(200);
      expect(reply.body.data.buyerMessage).toMatchObject({ role: 'AGENT', deliveryStatus: 'SENT' });
      expect(reply.body.data.aiMessage).toBeNull();
      expect(wa.sent).toEqual([
        expect.objectContaining({ to: '+919811100001', body: expect.stringContaining('Rohan') }),
      ]);
    });

    it('cannot pretend to be the buyer in a real WhatsApp conversation', async () => {
      const res = await http()
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(bearer(a))
        .send({ content: 'fake buyer text' })
        .expect(400);
      expect(res.body.error.code).toBe('BUYER_MESSAGES_TEST_ONLY');
    });

    it('blocks free-form replies more than 24 hours after the buyer last wrote', async () => {
      await prismaOf(app).conversation.update({
        where: { id: conversationId },
        data: { lastBuyerMessageAt: new Date(Date.now() - 25 * 3600_000) },
      });
      const res = await http()
        .post(`/api/v1/conversations/${conversationId}/messages`)
        .set(bearer(agent))
        .send({ content: 'Following up!', as: 'AGENT' })
        .expect(409);
      expect(res.body.error.code).toBe('WHATSAPP_WINDOW_CLOSED');
      expect(wa.sent).toHaveLength(0);
    });

    it('re-opens a closed conversation when the buyer writes again', async () => {
      await http()
        .patch(`/api/v1/conversations/${conversationId}`)
        .set(bearer(a))
        .send({ status: 'CLOSED', aiEnabled: true })
        .expect(200);
      await deliverWebhook(messageBody(A_NUMBER_ID, '919811100001', 'Still available?'));
      const detail = (await conversation(a, conversationId)).body.data;
      expect(detail.status).toBe('OPEN');
      expect(wa.sent).toHaveLength(1);
    });
  });

  it('records a failed delivery with a reason the team can read', async () => {
    await deliverWebhook(messageBody(A_NUMBER_ID, '919810000000', '2 BHK chahiye'));
    const failed = await prismaOf(app).message.findFirstOrThrow({
      where: { role: 'AI', conversation: { lead: { phone: '+919810000000' } } },
    });
    expect(failed.deliveryStatus).toBe('FAILED');
    expect(failed.deliveryError).toMatch(/cannot receive WhatsApp/);
  });

  it('keeps each business’s buyers separate', async () => {
    await deliverWebhook(messageBody(B_NUMBER_ID, '919811100001', 'Hello B Realty'));
    const listA = (await conversationsOf(a)).body.data as Array<{ id: string }>;
    const listB = (await conversationsOf(b)).body.data as Array<{
      id: string;
      lead: { phone: string };
    }>;
    expect(listB).toHaveLength(1);
    expect(listA.map((c) => c.id)).not.toContain(listB[0]!.id);
    expect(wa.sent).toEqual([expect.objectContaining({ phoneNumberId: B_NUMBER_ID })]);
    await http().get(`/api/v1/conversations/${listB[0]!.id}`).set(bearer(a)).expect(404);
  });

  describe('demo simulator', () => {
    it('runs a simulated message through the same flow as a real one', async () => {
      const res = await http()
        .post('/api/v1/channels/whatsapp/simulate')
        .set(bearer(agent))
        .send({ from: '98222 00001', name: 'Amit', text: '2 BHK on rent in Noida?' })
        .expect(200);
      const detail = (await conversation(a, res.body.data.conversationId)).body.data;
      expect(detail).toMatchObject({
        channel: 'WHATSAPP',
        lead: { name: 'Amit', phone: '+919822200001' },
      });
      expect(detail.messages.map((m: { role: string }) => m.role)).toEqual(['BUYER', 'AI']);
      expect(wa.sent).toHaveLength(1);
    });

    it('requires a connected number', async () => {
      const c = await registerBusiness(app, { businessName: 'C Realty' });
      const res = await http()
        .post('/api/v1/channels/whatsapp/simulate')
        .set(bearer(c))
        .send({ from: '98222 00002', text: 'hi' })
        .expect(409);
      expect(res.body.error.code).toBe('WHATSAPP_NOT_CONNECTED');
    });
  });

  it('disconnecting keeps conversations and stops routing messages', async () => {
    const res = await http().delete('/api/v1/channels/whatsapp').set(bearer(a)).expect(200);
    expect(res.body.data.account).toBeNull();
    const before = await prismaOf(app).message.count({ where: { tenantId: a.activeTenant!.id } });
    await deliverWebhook(messageBody(A_NUMBER_ID, '919811100001', 'Are you there?'));
    expect(await prismaOf(app).message.count({ where: { tenantId: a.activeTenant!.id } })).toBe(
      before,
    );
    expect((await conversationsOf(a)).body.data.length).toBeGreaterThan(0);
    await http().delete('/api/v1/channels/whatsapp').set(bearer(a)).expect(404);
  });
});
