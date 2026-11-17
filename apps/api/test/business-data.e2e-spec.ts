import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { BusinessDataService } from '../src/modules/business-data/business-data.service';
import { createTestApp } from './app.factory';
import {
  addMemberAndLogin,
  bearer,
  PASSWORD,
  registerBusiness,
  type TestSession,
} from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

describe('Business data export & deletion (e2e)', () => {
  let app: INestApplication;
  let owner: TestSession;
  let admin: TestSession;
  let other: TestSession;
  const http = () => request(app.getHttpServer());
  const tenantId = () => owner.activeTenant!.id;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await registerBusiness(app, { businessName: 'Delete Realty' });
    other = await registerBusiness(app, { businessName: 'Stay Realty' });
    admin = await addMemberAndLogin(app, tenantId(), 'ADMIN');

    await http()
      .post('/api/v1/properties')
      .set(bearer(owner))
      .send({
        title: '2 BHK Sector 62',
        propertyType: 'APARTMENT',
        price: 6_500_000,
        city: 'Noida',
      })
      .expect(201);
    const chat = await http()
      .post('/api/v1/conversations')
      .set(bearer(owner))
      .send({ phone: '98111 22333' })
      .expect(201);
    await http()
      .post(`/api/v1/conversations/${chat.body.data.id}/messages`)
      .set(bearer(owner))
      .send({ content: 'Mujhe 2 BHK chahiye 70 lakh tak' })
      .expect(200);
    await http()
      .post('/api/v1/properties')
      .set(bearer(other))
      .send({ title: 'Other business flat', propertyType: 'APARTMENT', price: 1, city: 'Pune' })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  it('exports everything the business stored — and nothing secret or from other businesses', async () => {
    await http().get('/api/v1/tenants/current/data-export').set(bearer(admin)).expect(403);
    const res = await http()
      .get('/api/v1/tenants/current/data-export')
      .set(bearer(owner))
      .expect(200);
    const data = res.body.data;
    expect(data.format).toBe('rea-business-export/1');
    expect(data.business).toMatchObject({ name: 'Delete Realty' });
    expect(data.members.map((m: { email: string }) => m.email).sort()).toEqual(
      [owner.user.email, admin.user.email].sort(),
    );
    expect(data.properties).toHaveLength(1);
    expect(data.properties[0]).toMatchObject({ title: '2 BHK Sector 62', price: 6_500_000 });
    expect(data.leads).toHaveLength(1);
    expect(data.conversations[0].messages.length).toBeGreaterThanOrEqual(2);
    const text = JSON.stringify(data);
    expect(text).not.toContain('passwordHash');
    expect(text).not.toContain('accessTokenEncrypted');
    expect(text).not.toContain('Other business flat');
    expect(data.auditLog.some((e: { action: string }) => e.action === 'property.created')).toBe(
      true,
    );
  });

  it('requires the owner, the password and the exact business name to schedule deletion', async () => {
    const url = '/api/v1/tenants/current/deletion';
    await http()
      .post(url)
      .set(bearer(admin))
      .send({ password: PASSWORD, confirmBusinessName: 'Delete Realty' })
      .expect(403);
    const wrongPassword = await http()
      .post(url)
      .set(bearer(owner))
      .send({ password: 'nope-nope-nope', confirmBusinessName: 'Delete Realty' })
      .expect(400);
    expect(wrongPassword.body.error.details[0].field).toBe('password');
    const wrongName = await http()
      .post(url)
      .set(bearer(owner))
      .send({ password: PASSWORD, confirmBusinessName: 'delete realty' })
      .expect(400);
    expect(wrongName.body.error.details[0].field).toBe('confirmBusinessName');
  });

  it('schedules deletion 30 days out, can be cancelled, and shows on the business', async () => {
    const url = '/api/v1/tenants/current/deletion';
    const res = await http()
      .post(url)
      .set(bearer(owner))
      .send({ password: PASSWORD, confirmBusinessName: 'Delete Realty' })
      .expect(200);
    const days = (Date.parse(res.body.data.deletionScheduledFor) - Date.now()) / 86_400_000;
    expect(Math.round(days)).toBe(30);

    const tenant = await http().get('/api/v1/tenants/current').set(bearer(admin)).expect(200);
    expect(tenant.body.data.deletionScheduledFor).toBe(res.body.data.deletionScheduledFor);
    await http()
      .post(url)
      .set(bearer(owner))
      .send({ password: PASSWORD, confirmBusinessName: 'Delete Realty' })
      .expect(409);

    await http().delete(url).set(bearer(owner)).expect(204);
    await http().delete(url).set(bearer(owner)).expect(409);
    const after = await http().get('/api/v1/tenants/current').set(bearer(owner)).expect(200);
    expect(after.body.data.deletionScheduledFor).toBeNull();
  });

  it('purges every row of a business once its date passes, keeping other businesses intact', async () => {
    await http()
      .post('/api/v1/tenants/current/deletion')
      .set(bearer(owner))
      .send({ password: PASSWORD, confirmBusinessName: 'Delete Realty' })
      .expect(200);
    const service = app.get(BusinessDataService);
    expect(await service.purgeDue(new Date())).toBe(0); // not due yet

    const prisma = prismaOf(app);
    // A member who also belongs to another business keeps their account.
    const adminUser = await prisma.user.findUniqueOrThrow({ where: { email: admin.user.email } });
    await prisma.membership.create({
      data: { tenantId: other.activeTenant!.id, userId: adminUser.id, role: 'VIEWER' },
    });

    expect(await service.purgeDue(new Date(Date.now() + 31 * 86_400_000))).toBe(1);

    const id = tenantId();
    expect(await prisma.tenant.findUnique({ where: { id } })).toBeNull();
    for (const count of [
      prisma.property.count({ where: { tenantId: id } }),
      prisma.lead.count({ where: { tenantId: id } }),
      prisma.message.count({ where: { tenantId: id } }),
      prisma.auditLog.count({ where: { tenantId: id } }),
      prisma.membership.count({ where: { tenantId: id } }),
    ])
      expect(await count).toBe(0);
    expect(await prisma.user.findUnique({ where: { email: owner.user.email } })).toBeNull();
    expect(await prisma.user.findUnique({ where: { email: admin.user.email } })).not.toBeNull();
    expect(await prisma.property.count({ where: { tenantId: other.activeTenant!.id } })).toBe(1);

    // The deleted owner's token no longer works.
    await http().get('/api/v1/tenants/current').set(bearer(owner)).expect(401);
  });
});
