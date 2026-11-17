import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { TokenService } from '../src/modules/auth/token.service';
import { createTestApp } from './app.factory';
import { bearer, extractRefreshCookie, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

/**
 * Proves Business A cannot read or modify Business B's data through any Phase 1 route,
 * including by tampering with request parameters, headers, bodies or token claims.
 */
describe('Tenant isolation (e2e)', () => {
  let app: INestApplication;
  let a: TestSession;
  let b: TestSession;
  let aTenantId: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    a = await registerBusiness(app, { businessName: 'Business A Realty' });
    b = await registerBusiness(app, {
      businessName: 'Business B Developers',
      businessType: 'DEVELOPER',
    });
    aTenantId = a.activeTenant!.id;
    await http()
      .patch('/api/v1/tenants/current/profile')
      .set(bearer(b))
      .send({ city: 'Gurugram' })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  it('each owner only ever sees their own business, profile, settings, dashboard and audit trail', async () => {
    const [tenant, profile, dashboard, audit] = await Promise.all([
      http().get('/api/v1/tenants/current').set(bearer(a)).expect(200),
      http().get('/api/v1/tenants/current/profile').set(bearer(a)).expect(200),
      http().get('/api/v1/dashboard/overview').set(bearer(a)).expect(200),
      http().get('/api/v1/audit-logs?pageSize=100').set(bearer(a)).expect(200),
    ]);
    expect(tenant.body.data.id).toBe(a.activeTenant!.id);
    expect(profile.body.data.city).toBeNull();
    expect(dashboard.body.data.tenant.id).toBe(a.activeTenant!.id);

    const bAuditIds = await prismaOf(app).auditLog.findMany({
      where: { tenantId: b.activeTenant!.id },
      select: { id: true },
    });
    const seen = new Set(audit.body.data.map((row: { id: string }) => row.id));
    expect(bAuditIds.length).toBeGreaterThan(0);
    for (const { id } of bAuditIds) expect(seen.has(id)).toBe(false);
    expect(JSON.stringify(audit.body)).not.toContain(b.activeTenant!.id);
  });

  it('ignores tenant IDs supplied through query strings and headers', async () => {
    const res = await http()
      .get(`/api/v1/tenants/current?tenantId=${b.activeTenant!.id}`)
      .set(bearer(a))
      .set('X-Tenant-Id', b.activeTenant!.id);
    // Unknown query params on GET are ignored; the tenant is still A's.
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(a.activeTenant!.id);
  });

  it('rejects tenant IDs in request bodies and leaves Business B untouched', async () => {
    const res = await http()
      .patch('/api/v1/tenants/current')
      .set(bearer(a))
      .send({ tenantId: b.activeTenant!.id, name: 'Hijacked' })
      .expect(400);
    expect(res.body.error.details.map((d: { field: string }) => d.field)).toEqual(['tenantId']);

    await http()
      .patch('/api/v1/tenants/current/profile')
      .set(bearer(a))
      .send({ tenantId: b.activeTenant!.id, city: 'Hijack City' })
      .expect(400);

    const bTenant = await http().get('/api/v1/tenants/current').set(bearer(b)).expect(200);
    const bProfile = await http().get('/api/v1/tenants/current/profile').set(bearer(b)).expect(200);
    expect(bTenant.body.data.name).toBe('Business B Developers');
    expect(bProfile.body.data.city).toBe('Gurugram');
  });

  it('A’s writes only change A', async () => {
    await http()
      .patch('/api/v1/tenants/current/settings')
      .set(bearer(a))
      .send({ preferredLanguage: 'hinglish' })
      .expect(200);
    const bSettings = await http()
      .get('/api/v1/tenants/current/settings')
      .set(bearer(b))
      .expect(200);
    expect(bSettings.body.data.preferredLanguage).toBe('en');
  });

  it('rejects a correctly signed token whose tenant claim points at Business B', async () => {
    // Simulates a token-minting bug: A's user with B's tenant and B's owner membership.
    const forged = await app.get(TokenService).signAccessToken({
      sub: a.user.id,
      fam: (await prismaOf(app).refreshSession.findFirstOrThrow({ where: { userId: a.user.id } }))
        .familyId,
      tid: b.activeTenant!.id,
      mid: b.activeTenant!.membershipId,
    });
    await http()
      .get('/api/v1/tenants/current')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
    await http()
      .patch('/api/v1/tenants/current')
      .set('Authorization', `Bearer ${forged}`)
      .send({ name: 'Hijacked' })
      .expect(401);
  });

  it('rejects tokens signed with a different secret', async () => {
    const { JwtService } = await import('@nestjs/jwt');
    const forged = await new JwtService().signAsync(
      { fam: 'x', tid: b.activeTenant!.id, mid: b.activeTenant!.membershipId },
      {
        subject: b.user.id,
        secret: 'attacker-secret-attacker-secret-attacker',
        issuer: 'rea-api',
        audience: 'rea-web',
      },
    );
    await http()
      .get('/api/v1/tenants/current')
      .set('Authorization', `Bearer ${forged}`)
      .expect(401);
  });

  it('refuses to switch into a business the user does not belong to', async () => {
    const res = await http()
      .post('/api/v1/auth/switch-tenant')
      .set(bearer(a))
      .send({ tenantId: b.activeTenant!.id })
      .expect(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('a user in both businesses can switch, and data follows the active membership only', async () => {
    const prisma = prismaOf(app);
    // Make A's owner a VIEWER in B (as if they had accepted an invitation).
    await prisma.membership.create({
      data: { tenantId: b.activeTenant!.id, userId: a.user.id, role: 'VIEWER' },
    });

    const switched = await http()
      .post('/api/v1/auth/switch-tenant')
      .set(bearer(a))
      .send({ tenantId: b.activeTenant!.id })
      .expect(200);
    const inB = switched.body.data;
    expect(inB.activeTenant).toMatchObject({ id: b.activeTenant!.id, role: 'VIEWER' });

    const tenant = await http().get('/api/v1/tenants/current').set(bearer(inB)).expect(200);
    expect(tenant.body.data.id).toBe(b.activeTenant!.id);
    // Role in B is VIEWER, regardless of being OWNER in A.
    await http()
      .patch('/api/v1/tenants/current')
      .set(bearer(inB))
      .send({ name: 'Nope' })
      .expect(403);

    // The refresh session now continues in B.
    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', a.refreshCookie)
      .expect(200);
    expect(refreshed.body.data.activeTenant.id).toBe(b.activeTenant!.id);
    a = {
      ...a,
      ...refreshed.body.data,
      refreshCookie: extractRefreshCookie(refreshed.headers['set-cookie']),
    };
  });

  it('suspending a membership cuts off access on the very next request', async () => {
    const prisma = prismaOf(app);
    await prisma.membership.update({
      where: { tenantId_userId: { tenantId: b.activeTenant!.id, userId: a.user.id } },
      data: { status: 'SUSPENDED' },
    });
    await http().get('/api/v1/tenants/current').set(bearer(a)).expect(401);

    // Refreshing falls back to the user's remaining active business (A).
    const refreshed = await http()
      .post('/api/v1/auth/refresh')
      .set('Cookie', a.refreshCookie)
      .expect(200);
    expect(refreshed.body.data.activeTenant.id).toBe(aTenantId);
  });

  it('a suspended business is locked out entirely', async () => {
    const prisma = prismaOf(app);
    await prisma.tenant.update({
      where: { id: b.activeTenant!.id },
      data: { status: 'SUSPENDED' },
    });
    await http().get('/api/v1/tenants/current').set(bearer(b)).expect(401);

    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email: b.email, password: 'Str0ng-Passw0rd!' })
      .expect(200);
    expect(login.body.data.activeTenant).toBeNull();
    const noTenant = await http()
      .get('/api/v1/tenants/current')
      .set(bearer(login.body.data))
      .expect(403);
    expect(noTenant.body.error.message).toMatch(/No active business/);
  });
});
