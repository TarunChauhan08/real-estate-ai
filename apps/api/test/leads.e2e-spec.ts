import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES_AGENT' | 'VIEWER';
const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'];

describe('Leads (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  const staff = {} as Record<Role, TestSession>;
  const http = () => request(app.getHttpServer());
  let counter = 0;
  const newLead = (overrides: object = {}) => ({
    name: 'Rahul Sharma',
    phone: `98765${String(10000 + counter++)}`,
    ...overrides,
  });

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'A Realty' });
    b = await registerBusiness(app, { businessName: 'B Realty' });
    staff.OWNER = a;
    for (const role of ROLES.slice(1))
      staff[role] = await addMemberAndLogin(app, a.activeTenant!.id, role);
  });

  afterAll(async () => {
    await app.close();
  });

  it('normalises the phone to E.164 and applies defaults', async () => {
    const res = await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send({ name: 'Priya Singh', phone: '098765 43210', email: ' Priya@Example.COM ' })
      .expect(201);
    expect(res.body.data.phone).toBe('+919876543210');
    expect(res.body.data.email).toBe('priya@example.com');
    expect(res.body.data.status).toBe('NEW');
    expect(res.body.data.source).toBe('MANUAL');
    expect(res.body.data.temperature).toBe('UNSCORED');
  });

  it('de-duplicates by phone within a business but not across businesses', async () => {
    const dup = await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send({ name: 'Dup', phone: '+91 98765 43210' })
      .expect(409);
    expect(dup.body.error.code).toBe('LEAD_PHONE_EXISTS');
    await http()
      .post('/api/v1/leads')
      .set(bearer(b))
      .send({ name: 'Same buyer', phone: '9876543210' })
      .expect(201);
  });

  it('rejects bad phones, unknown fields and inverted budgets', async () => {
    await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send(newLead({ phone: '12345' }))
      .expect(400);
    await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send(newLead({ tenantId: 'x' }))
      .expect(400);
    await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send(newLead({ budgetMin: 9_000_000, budgetMax: 5_000_000 }))
      .expect(400);
    const { body } = await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send(newLead({ budgetMin: 5_000_000 }))
      .expect(201);
    await http()
      .patch(`/api/v1/leads/${body.data.id}`)
      .set(bearer(a))
      .send({ budgetMax: 1_000_000 })
      .expect(400);
  });

  it('PATCH ignores null for required fields and clears optional ones', async () => {
    const { body } = await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send(newLead({ notes: 'hello' }))
      .expect(201);
    const res = await http()
      .patch(`/api/v1/leads/${body.data.id}`)
      .set(bearer(a))
      .send({ name: null, phone: null, notes: null })
      .expect(200);
    expect(res.body.data.name).toBe('Rahul Sharma');
    expect(res.body.data.notes).toBeNull();
  });

  it('enforces pipeline rules and audits status changes', async () => {
    const { body } = await http().post('/api/v1/leads').set(bearer(a)).send(newLead()).expect(201);
    const id = body.data.id as string;
    const status = (value: string) =>
      http().patch(`/api/v1/leads/${id}/status`).set(bearer(a)).send({ status: value });

    await status('CONTACTED').expect(200);
    await status('LOST').expect(200);
    const blocked = await status('WON').expect(409);
    expect(blocked.body.error.code).toBe('LEAD_INVALID_TRANSITION');
    await status('NEW').expect(200);
    await status('WON').expect(200);
    await status('NEW').expect(409);

    const audit = await prismaOf(app).auditLog.count({
      where: { entityId: id, action: 'lead.status_changed' },
    });
    expect(audit).toBe(4);
  });

  it('assigns only to active members of the same business', async () => {
    const { body } = await http().post('/api/v1/leads').set(bearer(a)).send(newLead()).expect(201);
    const agentMembership = await prismaOf(app).membership.findFirstOrThrow({
      where: { tenantId: a.activeTenant!.id, role: 'SALES_AGENT' },
    });
    const bMembership = await prismaOf(app).membership.findFirstOrThrow({
      where: { tenantId: b.activeTenant!.id },
    });
    const ok = await http()
      .patch(`/api/v1/leads/${body.data.id}/assignee`)
      .set(bearer(a))
      .send({ membershipId: agentMembership.id })
      .expect(200);
    expect(ok.body.data.assignedTo).toEqual({ id: agentMembership.id, name: 'Test SALES_AGENT' });
    await http()
      .patch(`/api/v1/leads/${body.data.id}/assignee`)
      .set(bearer(a))
      .send({ membershipId: bMembership.id })
      .expect(400);
    const cleared = await http()
      .patch(`/api/v1/leads/${body.data.id}/assignee`)
      .set(bearer(a))
      .send({ membershipId: null })
      .expect(200);
    expect(cleared.body.data.assignedTo).toBeNull();
  });

  it('searches by formatted phone digits and filters by status', async () => {
    const { body } = await http()
      .post('/api/v1/leads')
      .set(bearer(a))
      .send({ name: 'Searchable Person', phone: '9123456780' })
      .expect(201);
    const res = await http().get('/api/v1/leads?q=91234 56780').set(bearer(a)).expect(200);
    expect(res.body.data.map((l: { id: string }) => l.id)).toContain(body.data.id);
    const none = await http()
      .get('/api/v1/leads?q=Searchable&status=WON')
      .set(bearer(a))
      .expect(200);
    expect(none.body.meta.total).toBe(0);
  });

  it("another business cannot read, change, status-change or assign this business's lead", async () => {
    const { body } = await http().post('/api/v1/leads').set(bearer(a)).send(newLead()).expect(201);
    const id = body.data.id as string;
    await http().get(`/api/v1/leads/${id}`).set(bearer(b)).expect(404);
    await http().patch(`/api/v1/leads/${id}`).set(bearer(b)).send({ name: 'Hijack' }).expect(404);
    await http()
      .patch(`/api/v1/leads/${id}/status`)
      .set(bearer(b))
      .send({ status: 'LOST' })
      .expect(404);
    await http()
      .patch(`/api/v1/leads/${id}/assignee`)
      .set(bearer(b))
      .send({ membershipId: null })
      .expect(404);
    const list = await http().get('/api/v1/leads?pageSize=100').set(bearer(b)).expect(200);
    expect(list.body.data.some((l: { id: string }) => l.id === id)).toBe(false);
  });

  describe('role matrix', () => {
    let leadId: string;
    beforeAll(async () => {
      const { body } = await http()
        .post('/api/v1/leads')
        .set(bearer(a))
        .send(newLead())
        .expect(201);
      leadId = body.data.id;
    });

    const rules: Array<{
      name: string;
      call: (s: TestSession, n: number) => request.Test;
      allowed: Role[];
    }> = [
      {
        name: 'list leads',
        call: (s) => http().get('/api/v1/leads').set(bearer(s)),
        allowed: ROLES,
      },
      {
        name: 'create lead',
        call: (s, n) =>
          http()
            .post('/api/v1/leads')
            .set(bearer(s))
            .send({ name: 'Matrix Lead', phone: `+9190000${String(10000 + n)}` }),
        allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
      },
      {
        name: 'change status',
        call: (s) =>
          http()
            .patch(`/api/v1/leads/${leadId}/status`)
            .set(bearer(s))
            .send({ status: 'CONTACTED' }),
        allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT'],
      },
      {
        name: 'assign lead',
        call: (s) =>
          http()
            .patch(`/api/v1/leads/${leadId}/assignee`)
            .set(bearer(s))
            .send({ membershipId: null }),
        allowed: ['OWNER', 'ADMIN', 'MANAGER'],
      },
      {
        name: 'list properties',
        call: (s) => http().get('/api/v1/properties').set(bearer(s)),
        allowed: ROLES,
      },
      {
        name: 'create property',
        call: (s) =>
          http().post('/api/v1/properties').set(bearer(s)).send({
            title: 'Matrix flat',
            propertyType: 'APARTMENT',
            price: 1_000_000,
            city: 'Noida',
          }),
        allowed: ['OWNER', 'ADMIN', 'MANAGER'],
      },
    ];

    const cases = rules.flatMap((rule) =>
      ROLES.map((role) => [rule.name, role, rule.allowed.includes(role), rule] as const),
    );
    it.each(cases)('%s as %s → allowed=%s', async (_n, role, allowed, rule) => {
      const res = await rule.call(staff[role], counter++);
      if (allowed) {
        expect(res.status).toBeLessThan(300);
      } else {
        expect(res.status).toBe(403);
        expect(res.body.error.code).toBe('FORBIDDEN');
      }
    });

    it('anonymous requests are rejected', async () => {
      await http().get('/api/v1/leads').expect(401);
      await http().get('/api/v1/properties').expect(401);
    });
  });
});
