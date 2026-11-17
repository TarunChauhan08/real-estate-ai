import { createHmac } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type FakeWhatsAppClient } from '../src/modules/whatsapp/client/fake.client';
import { WHATSAPP_CLIENT } from '../src/modules/whatsapp/client/whatsapp-client';
import { SiteVisitRemindersService } from '../src/modules/site-visits/site-visit-reminders.service';
import { WhatsAppInboundService } from '../src/modules/whatsapp-webhook/whatsapp-inbound.service';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

const HOUR = 3600_000;
const inHours = (hours: number) => new Date(Date.now() + hours * HOUR).toISOString();

/**
 * Site visits end to end: the AI turns a buyer's request into a visit for the team to confirm,
 * the team confirms / reschedules / cancels, the buyer is told on WhatsApp in their language,
 * reminders go out once, and outcomes move the lead through the pipeline.
 */
describe('Site visits (e2e)', () => {
  const NUMBER_ID = '400000000000004';
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  let agent: TestSession;
  let viewer: TestSession;
  let agentMembershipId: string;
  let propertyId: string;
  let otherPropertyId: string;
  let wa: FakeWhatsAppClient;
  let seq = 0;
  const http = () => request(app.getHttpServer());

  async function buyerWrites(from: string, text: string, name?: string) {
    seq += 1;
    const raw = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [
        {
          changes: [
            {
              field: 'messages',
              value: {
                metadata: { phone_number_id: NUMBER_ID },
                contacts: name ? [{ profile: { name }, wa_id: from }] : [],
                messages: [{ from, id: `wamid.visit-${seq}`, type: 'text', text: { body: text } }],
              },
            },
          ],
        },
      ],
    });
    await http()
      .post('/api/v1/webhooks/whatsapp')
      .set('content-type', 'application/json')
      .set(
        'x-hub-signature-256',
        `sha256=${createHmac('sha256', 'test-whatsapp-app-secret').update(raw).digest('hex')}`,
      )
      .send(raw)
      .expect(200);
    await app.get(WhatsAppInboundService).whenIdle();
  }

  const visits = (session: TestSession, query = '') =>
    http().get(`/api/v1/site-visits${query}`).set(bearer(session)).expect(200);
  const patch = (session: TestSession, id: string, body: object) =>
    http().patch(`/api/v1/site-visits/${id}`).set(bearer(session)).send(body);

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    wa = app.get<FakeWhatsAppClient>(WHATSAPP_CLIENT);
    a = await registerBusiness(app, { businessName: 'Skyline Realty' });
    b = await registerBusiness(app, { businessName: 'Other Realty' });
    agent = await addMemberAndLogin(app, a.activeTenant!.id, 'SALES_AGENT');
    viewer = await addMemberAndLogin(app, a.activeTenant!.id, 'VIEWER');
    agentMembershipId = (
      await prismaOf(app).membership.findFirstOrThrow({
        where: { tenantId: a.activeTenant!.id, role: 'SALES_AGENT' },
      })
    ).id;
    await prismaOf(app).user.updateMany({
      where: { memberships: { some: { id: agentMembershipId } } },
      data: { name: 'Rohan' },
    });

    const property = await http()
      .post('/api/v1/properties')
      .set(bearer(a))
      .send({
        title: '3 BHK Sector 150',
        propertyType: 'APARTMENT',
        price: 8_200_000,
        city: 'Noida',
        locality: 'Sector 150',
        bedrooms: 3,
      })
      .expect(201);
    propertyId = property.body.data.id;
    const other = await http()
      .post('/api/v1/properties')
      .set(bearer(b))
      .send({ title: 'Other listing', propertyType: 'APARTMENT', price: 5_000_000, city: 'Pune' })
      .expect(201);
    otherPropertyId = other.body.data.id;

    await http()
      .put('/api/v1/channels/whatsapp')
      .set(bearer(a))
      .send({
        phoneNumberId: NUMBER_ID,
        displayPhoneNumber: '98100 40000',
        accessToken: 'EAAG-site-visit-test-token',
      })
      .expect(200);
  });

  beforeEach(() => wa.reset());

  afterAll(async () => {
    await app.close();
  });

  describe('the AI records a buyer’s request', () => {
    it('turns “can I visit on Saturday at 11am” into a visit waiting for the team', async () => {
      await buyerWrites(
        '919811200001',
        'Hi, 3 BHK in Noida, 85 lakh. Can I visit on Saturday at 11am?',
        'Meera Iyer',
      );
      const list = await visits(a, '?scope=requested');
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0]).toMatchObject({
        status: 'REQUESTED',
        scheduledAt: null,
        requestedSlot: 'Saturday at 11am',
        lead: { name: 'Meera Iyer', phone: '+919811200001' },
      });
      expect(list.body.data[0].conversationId).toEqual(expect.any(String));
    });

    it('keeps one open request per buyer and updates their preferred time', async () => {
      await buyerWrites('919811200001', 'Actually visit kal shaam is better');
      const list = await visits(a, '?scope=requested');
      expect(list.body.data).toHaveLength(1);
      expect(list.body.data[0].requestedSlot).toBe('kal shaam');
    });
  });

  describe('the team confirms, reschedules and cancels', () => {
    let visitId: string;

    beforeAll(async () => {
      visitId = (await visits(a, '?scope=requested')).body.data[0].id;
    });

    it('viewers can see visits but not change them', async () => {
      await visits(viewer);
      await patch(viewer, visitId, { status: 'CANCELLED' }).expect(403);
    });

    it('needs a future time to confirm', async () => {
      const missing = await patch(agent, visitId, { status: 'CONFIRMED' }).expect(400);
      expect(missing.body.error.details[0].field).toBe('scheduledAt');
      const past = await patch(agent, visitId, {
        status: 'CONFIRMED',
        scheduledAt: inHours(-3),
      }).expect(400);
      expect(past.body.error.details[0].message).toMatch(/future/);
    });

    it('only accepts this business’s listings and team members', async () => {
      const res = await patch(agent, visitId, {
        status: 'CONFIRMED',
        scheduledAt: inHours(48),
        propertyId: otherPropertyId,
      }).expect(400);
      expect(res.body.error.details[0].field).toBe('propertyId');
      const bMember = await prismaOf(app).membership.findFirstOrThrow({
        where: { tenantId: b.activeTenant!.id },
      });
      await patch(agent, visitId, {
        status: 'CONFIRMED',
        scheduledAt: inHours(48),
        assignedToId: bMember.id,
      }).expect(400);
    });

    it('confirms the visit, tells the buyer on WhatsApp and moves the lead forward', async () => {
      const res = await patch(agent, visitId, {
        status: 'CONFIRMED',
        scheduledAt: inHours(48),
        propertyId,
        assignedToId: agentMembershipId,
      }).expect(200);
      expect(res.body.data.notification).toEqual({ sent: true, reason: null });
      expect(res.body.data.visit).toMatchObject({
        status: 'CONFIRMED',
        property: { id: propertyId, title: '3 BHK Sector 150' },
        assignedTo: { id: agentMembershipId, name: 'Rohan' },
      });

      expect(wa.sent).toHaveLength(1);
      expect(wa.sent[0]!.to).toBe('+919811200001');
      expect(wa.sent[0]!.body).toMatch(/confirm/i);
      expect(wa.sent[0]!.body).toContain('3 BHK Sector 150, Sector 150, Noida');
      expect(wa.sent[0]!.body).toContain('Rohan');

      const lead = await prismaOf(app).lead.findFirstOrThrow({ where: { phone: '+919811200001' } });
      expect(lead.status).toBe('SITE_VISIT_SCHEDULED');

      // The confirmation is part of the conversation, so the AI knows about it next time.
      const message = await prismaOf(app).message.findFirstOrThrow({
        where: { content: wa.sent[0]!.body },
      });
      expect(message).toMatchObject({ role: 'AI', deliveryStatus: 'SENT' });

      expect((await visits(a, '?scope=requested')).body.data).toHaveLength(0);
      expect((await visits(a, '?scope=upcoming')).body.data[0].id).toBe(visitId);
    });

    it('the AI does not open a second request once a visit is confirmed', async () => {
      await buyerWrites('919811200001', 'See you at the site visit!');
      expect((await visits(a, '?scope=requested')).body.data).toHaveLength(0);
    });

    it('a new time is sent to the buyer as a reschedule', async () => {
      const res = await patch(agent, visitId, { scheduledAt: inHours(72) }).expect(200);
      expect(res.body.data.notification.sent).toBe(true);
      expect(wa.sent[0]!.body).toMatch(/new time/i);
    });

    it('saving without changes sends nothing', async () => {
      const res = await patch(agent, visitId, { notifyBuyer: true }).expect(200);
      expect(res.body.data.notification).toBeNull();
      expect(wa.sent).toHaveLength(0);
    });

    it('sends one reminder a few hours before, never twice', async () => {
      const reminders = app.get(SiteVisitRemindersService);
      await prismaOf(app).$executeRaw`
        UPDATE site_visits SET scheduled_at = now() + interval '2 hours',
          updated_at = now() - interval '1 day', reminder_sent_at = NULL
        WHERE id = ${visitId}::uuid`;
      expect(await reminders.runOnce()).toBe(1);
      expect(wa.sent[0]!.body).toMatch(/Reminder|Yaad/);
      expect(await reminders.runOnce()).toBe(0);
      expect(wa.sent).toHaveLength(1);
    });

    it('records the outcome; outcomes can be corrected but not re-opened', async () => {
      await prismaOf(app).$executeRaw`
        UPDATE site_visits SET scheduled_at = now() - interval '3 hours' WHERE id = ${visitId}::uuid`;
      // A confirmed visit whose time has passed waits in "past" for its outcome.
      expect((await visits(a, '?scope=past')).body.data.map((v: { id: string }) => v.id)).toContain(
        visitId,
      );

      const done = await patch(agent, visitId, { status: 'COMPLETED' }).expect(200);
      expect(done.body.data.notification).toBeNull();
      await patch(agent, visitId, { status: 'NO_SHOW' }).expect(200);
      const reopen = await patch(agent, visitId, { status: 'CONFIRMED' }).expect(409);
      expect(reopen.body.error.code).toBe('INVALID_SITE_VISIT_TRANSITION');
    });
  });

  describe('booking directly', () => {
    it('books for a lead and explains when the buyer cannot be messaged', async () => {
      const lead = await http()
        .post('/api/v1/leads')
        .set(bearer(a))
        .send({ name: 'Walk-in Buyer', phone: '98111 33344', source: 'WALK_IN' })
        .expect(201);
      const res = await http()
        .post('/api/v1/site-visits')
        .set(bearer(agent))
        .send({ leadId: lead.body.data.id, scheduledAt: inHours(30), propertyId })
        .expect(201);
      expect(res.body.data.visit).toMatchObject({
        status: 'CONFIRMED',
        lead: { name: 'Walk-in Buyer' },
      });
      expect(res.body.data.notification.sent).toBe(false);
      expect(res.body.data.notification.reason).toMatch(/not messaged you on WhatsApp/);
      expect(wa.sent).toHaveLength(0);
    });

    it('respects WhatsApp’s 24-hour window', async () => {
      await buyerWrites('919811200002', 'Hello', 'Late Buyer');
      await prismaOf(app).conversation.updateMany({
        where: { lead: { phone: '+919811200002' } },
        data: { lastBuyerMessageAt: new Date(Date.now() - 30 * HOUR) },
      });
      wa.reset();
      const lead = await prismaOf(app).lead.findFirstOrThrow({ where: { phone: '+919811200002' } });
      const res = await http()
        .post('/api/v1/site-visits')
        .set(bearer(a))
        .send({ leadId: lead.id, scheduledAt: inHours(30) })
        .expect(201);
      expect(res.body.data.notification.reason).toMatch(/24 hours/);
      expect(wa.sent).toHaveLength(0);
    });

    it('can skip the buyer message on purpose, and cancelling tells them', async () => {
      await buyerWrites('919811200003', 'Hi', 'Quiet Buyer');
      wa.reset();
      const lead = await prismaOf(app).lead.findFirstOrThrow({ where: { phone: '+919811200003' } });
      const booked = await http()
        .post('/api/v1/site-visits')
        .set(bearer(a))
        .send({ leadId: lead.id, scheduledAt: inHours(10), notifyBuyer: false })
        .expect(201);
      expect(booked.body.data.notification).toBeNull();
      expect(wa.sent).toHaveLength(0);

      const cancelled = await patch(a, booked.body.data.visit.id, { status: 'CANCELLED' }).expect(
        200,
      );
      expect(cancelled.body.data.notification.sent).toBe(true);
      expect(wa.sent[0]!.body).toMatch(/cancel/i);
    });

    it('rejects leads from another business', async () => {
      const otherLead = await http()
        .post('/api/v1/leads')
        .set(bearer(b))
        .send({ name: 'B lead', phone: '98111 55566' })
        .expect(201);
      const res = await http()
        .post('/api/v1/site-visits')
        .set(bearer(a))
        .send({ leadId: otherLead.body.data.id, scheduledAt: inHours(5) })
        .expect(400);
      expect(res.body.error.details[0].field).toBe('leadId');
    });
  });

  it('keeps each business’s visits private', async () => {
    const anyVisit = (await visits(a)).body.data[0];
    await http().get(`/api/v1/site-visits/${anyVisit.id}`).set(bearer(b)).expect(404);
    await patch(b, anyVisit.id, { status: 'CANCELLED' }).expect(404);
    expect((await visits(b)).body.data).toHaveLength(0);
  });

  it('shows upcoming visits on the dashboard', async () => {
    const res = await http().get('/api/v1/dashboard/overview').set(bearer(a)).expect(200);
    expect(res.body.data.metrics.siteVisits).toEqual({
      status: 'available',
      value: expect.any(Number),
    });
    expect(res.body.data.metrics.siteVisits.value).toBeGreaterThan(0);
  });
});
