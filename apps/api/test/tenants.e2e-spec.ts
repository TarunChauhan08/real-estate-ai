import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { bearer, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

describe('Tenant, profile, settings and onboarding (e2e)', () => {
  let app: INestApplication;
  let owner: TestSession;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await registerBusiness(app, { businessName: 'Noida Homes Brokerage' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /tenants/current returns the business resolved from the membership', async () => {
    const res = await http().get('/api/v1/tenants/current').set(bearer(owner)).expect(200);
    expect(res.body.data).toMatchObject({ id: owner.activeTenant!.id, name: 'Noida Homes Brokerage', status: 'PENDING' });
  });

  it('PATCH /tenants/current renames the business and audits the change', async () => {
    const res = await http()
      .patch('/api/v1/tenants/current')
      .set(bearer(owner))
      .send({ name: 'Noida Homes Realty' })
      .expect(200);
    expect(res.body.data.name).toBe('Noida Homes Realty');
    const audit = await prismaOf(app).auditLog.findFirst({
      where: { tenantId: owner.activeTenant!.id, action: 'tenant.updated' },
    });
    expect(audit?.metadata).toEqual({ fields: ['name'] });
  });

  it('rejects attempts to change immutable or unknown tenant fields', async () => {
    const res = await http()
      .patch('/api/v1/tenants/current')
      .set(bearer(owner))
      .send({ slug: 'hijack', status: 'ACTIVE' })
      .expect(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual(['slug', 'status']);
  });

  it('updates and clears business profile fields', async () => {
    const updated = await http()
      .patch('/api/v1/tenants/current/profile')
      .set(bearer(owner))
      .send({ phone: '+91 98765 43210', website: 'noidahomes.in', city: 'Noida', state: 'Uttar Pradesh' })
      .expect(200);
    expect(updated.body.data).toMatchObject({
      phone: '+91 98765 43210',
      website: 'https://noidahomes.in',
      city: 'Noida',
      country: 'IN',
    });

    const cleared = await http().patch('/api/v1/tenants/current/profile').set(bearer(owner)).send({ phone: '' }).expect(200);
    expect(cleared.body.data.phone).toBeNull();
  });

  it('validates profile input', async () => {
    const res = await http()
      .patch('/api/v1/tenants/current/profile')
      .set(bearer(owner))
      .send({ phone: 'call me', website: 'ftp://x', businessType: 'BANK' })
      .expect(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(
      expect.arrayContaining(['phone', 'website', 'businessType']),
    );
  });

  it('reads defaults and updates tenant settings', async () => {
    const defaults = await http().get('/api/v1/tenants/current/settings').set(bearer(owner)).expect(200);
    expect(defaults.body.data).toMatchObject({
      timezone: 'Asia/Kolkata',
      locale: 'en-IN',
      currency: 'INR',
      preferredLanguage: 'en',
    });

    const updated = await http()
      .patch('/api/v1/tenants/current/settings')
      .set(bearer(owner))
      .send({ preferredLanguage: 'hinglish', locale: 'hi-IN' })
      .expect(200);
    expect(updated.body.data).toMatchObject({ preferredLanguage: 'hinglish', locale: 'hi-IN' });
  });

  it('rejects invalid settings', async () => {
    const res = await http()
      .patch('/api/v1/tenants/current/settings')
      .set(bearer(owner))
      .send({ timezone: 'Mars/Olympus', currency: 'BTC', preferredLanguage: 'fr' })
      .expect(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field).sort()).toEqual([
      'currency',
      'preferredLanguage',
      'timezone',
    ]);
  });

  it('completes onboarding: saves all details and activates the business', async () => {
    const res = await http()
      .post('/api/v1/tenants/current/onboarding')
      .set(bearer(owner))
      .send({
        businessName: 'Noida Homes Brokerage',
        businessType: 'REAL_ESTATE_AGENCY',
        phone: '+91 99999 88888',
        website: 'https://noidahomes.in',
        city: 'Noida',
        state: 'Uttar Pradesh',
        timezone: 'Asia/Kolkata',
        preferredLanguage: 'hi',
      });
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ name: 'Noida Homes Brokerage', status: 'ACTIVE' });

    const [profile, settings] = await Promise.all([
      http().get('/api/v1/tenants/current/profile').set(bearer(owner)),
      http().get('/api/v1/tenants/current/settings').set(bearer(owner)),
    ]);
    expect(profile.body.data).toMatchObject({ businessType: 'REAL_ESTATE_AGENCY', city: 'Noida', phone: '+91 99999 88888' });
    expect(settings.body.data.preferredLanguage).toBe('hi');
  });

  it('dashboard overview reports real counts and marks unbuilt modules as not available', async () => {
    const res = await http().get('/api/v1/dashboard/overview').set(bearer(owner)).expect(200);
    const { metrics, setup, aiEmployee } = res.body.data;
    expect(metrics.teamMembers).toEqual({ status: 'available', value: 1 });
    expect(metrics.pendingInvitations).toEqual({ status: 'available', value: 0 });
    for (const key of ['totalLeads', 'qualifiedLeads', 'siteVisits', 'conversations', 'aiCalls']) {
      expect(metrics[key].status).toBe('not_available');
      expect(metrics[key]).not.toHaveProperty('value');
    }
    expect(aiEmployee).toEqual({ status: 'not_configured' });
    expect(setup.steps.find((s: { key: string }) => s.key === 'business_profile').completed).toBe(true);
    expect(setup.steps.find((s: { key: string }) => s.key === 'ai_employee').available).toBe(false);
  });

  it('GET /audit-logs lists this tenant’s events, newest first, with pagination and filters', async () => {
    const res = await http().get('/api/v1/audit-logs?pageSize=2').set(bearer(owner)).expect(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.meta).toMatchObject({ page: 1, pageSize: 2 });
    expect(res.body.meta.total).toBeGreaterThanOrEqual(5);
    expect(new Date(res.body.data[0].createdAt) >= new Date(res.body.data[1].createdAt)).toBe(true);
    expect(res.body.data[0].actor.email).toBe(owner.email);

    const filtered = await http()
      .get('/api/v1/audit-logs?action=tenant.onboarding_completed')
      .set(bearer(owner))
      .expect(200);
    expect(filtered.body.data).toHaveLength(1);

    await http().get('/api/v1/audit-logs?pageSize=1000').set(bearer(owner)).expect(400);
  });
});
