import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import {
  PASSWORD,
  bearer,
  extractRefreshCookie,
  login,
  registerBusiness,
  uniqueEmail,
} from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

describe('Authentication (e2e)', () => {
  let app: INestApplication;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('creates user, tenant, profile, settings, OWNER membership and a session atomically', async () => {
      const email = uniqueEmail();
      const res = await http()
        .post('/api/v1/auth/register')
        .send({
          name: 'Rahul Sharma',
          email: `  ${email.toUpperCase()} `,
          password: PASSWORD,
          businessName: 'Noida Homes Brokerage',
          businessType: 'BROKERAGE',
          acceptTerms: true,
        })
        .expect(201);

      const body = res.body.data;
      expect(body.accessToken).toEqual(expect.any(String));
      expect(body.expiresIn).toBe(900);
      expect(body.user).toEqual({
        id: expect.any(String),
        name: 'Rahul Sharma',
        email,
        emailVerified: false,
      });
      expect(body.activeTenant).toMatchObject({
        name: 'Noida Homes Brokerage',
        status: 'PENDING',
        role: 'OWNER',
      });
      expect(body.activeTenant.slug).toMatch(/^noida-homes-brokerage-[0-9a-f]{6}$/);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|tokenHash|\$argon2/);

      const cookie = (res.headers['set-cookie'] as unknown as string[]).find((c) =>
        c.startsWith('rea_refresh='),
      )!;
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Strict/);
      expect(cookie).toMatch(/Path=\/api\/v1\/auth/);
      expect(res.headers['cache-control']).toBe('no-store');

      const prisma = prismaOf(app);
      const tenantId = body.activeTenant.id as string;
      const [user, profile, settings, memberships, sessions, audits] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email } }),
        prisma.businessProfile.findUniqueOrThrow({ where: { tenantId } }),
        prisma.tenantSettings.findUniqueOrThrow({ where: { tenantId } }),
        prisma.membership.findMany({ where: { tenantId } }),
        prisma.refreshSession.findMany({ where: { tenantId } }),
        prisma.auditLog.findMany({ where: { tenantId }, orderBy: { createdAt: 'asc' } }),
      ]);
      expect(user.passwordHash).toMatch(/^\$argon2id\$/);
      expect(profile).toMatchObject({ businessType: 'BROKERAGE', country: 'IN' });
      expect(settings).toMatchObject({
        timezone: 'Asia/Kolkata',
        locale: 'en-IN',
        currency: 'INR',
      });
      expect(memberships).toEqual([
        expect.objectContaining({ userId: user.id, role: 'OWNER', status: 'ACTIVE' }),
      ]);
      expect(sessions).toHaveLength(1);
      expect(sessions[0]!.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(audits.map((a) => a.action)).toEqual(['tenant.created', 'auth.registered']);
    });

    it('rejects a duplicate email (case-insensitive) with 409 and creates nothing', async () => {
      const first = await registerBusiness(app);
      const tenantsBefore = await prismaOf(app).tenant.count();

      const res = await http()
        .post('/api/v1/auth/register')
        .send({
          name: 'Someone Else',
          email: first.email.toUpperCase(),
          password: PASSWORD,
          businessName: 'Other Realty',
          businessType: 'BUILDER',
          acceptTerms: true,
        })
        .expect(409);

      expect(res.body.error.code).toBe('EMAIL_TAKEN');
      expect(await prismaOf(app).tenant.count()).toBe(tenantsBefore);
    });

    it.each([
      ['weak password', { password: 'short' }, 'password'],
      ['password without digits', { password: 'onlyletters-here' }, 'password'],
      ['invalid email', { email: 'not-an-email' }, 'email'],
      ['unknown business type', { businessType: 'BANK' }, 'businessType'],
      ['terms not accepted', { acceptTerms: false }, 'acceptTerms'],
      ['unexpected field', { role: 'OWNER' }, 'role'],
    ])('rejects invalid registration: %s', async (_label, override, field) => {
      const res = await http()
        .post('/api/v1/auth/register')
        .send({
          name: 'Invalid',
          email: uniqueEmail(),
          password: PASSWORD,
          businessName: 'Invalid Realty',
          businessType: 'BROKERAGE',
          acceptTerms: true,
          ...override,
        })
        .expect(400);
      expect(res.body.error.code).toBe('VALIDATION_FAILED');
      expect(res.body.error.details.map((d: { field: string }) => d.field)).toContain(field);
    });
  });

  describe('POST /auth/login', () => {
    it('signs in with valid credentials', async () => {
      const owner = await registerBusiness(app);
      const session = await login(app, owner.email);
      expect(session.activeTenant?.role).toBe('OWNER');
      expect(session.user.email).toBe(owner.email);
    });

    it('rejects a wrong password and an unknown email with the same response', async () => {
      const owner = await registerBusiness(app);
      const wrong = await http()
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: 'Wr0ng-password' });
      const unknown = await http()
        .post('/api/v1/auth/login')
        .send({ email: uniqueEmail(), password: PASSWORD });
      expect(wrong.status).toBe(401);
      expect(unknown.status).toBe(401);
      expect(wrong.body.error.code).toBe('INVALID_CREDENTIALS');
      expect(unknown.body.error.message).toBe(wrong.body.error.message);
    });

    it('rejects a disabled account (after verifying the password)', async () => {
      const owner = await registerBusiness(app);
      await prismaOf(app).user.update({
        where: { email: owner.email },
        data: { status: 'DISABLED' },
      });

      const res = await http()
        .post('/api/v1/auth/login')
        .send({ email: owner.email, password: PASSWORD })
        .expect(403);
      expect(res.body.error.code).toBe('ACCOUNT_DISABLED');

      // Existing sessions stop working too.
      await http().get('/api/v1/auth/me').set(bearer(owner)).expect(401);
    });
  });

  describe('POST /auth/refresh', () => {
    it('rotates the refresh token and issues a new access token', async () => {
      const owner = await registerBusiness(app);
      const res = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', owner.refreshCookie)
        .expect(200);
      const rotated = extractRefreshCookie(res.headers['set-cookie']);

      expect(rotated).not.toBe(owner.refreshCookie);
      expect(res.body.data.accessToken).toEqual(expect.any(String));
      await http().get('/api/v1/auth/me').set(bearer(res.body.data)).expect(200);

      const sessions = await prismaOf(app).refreshSession.findMany({
        where: { user: { email: owner.email } },
        orderBy: { createdAt: 'asc' },
      });
      expect(sessions).toHaveLength(2);
      expect(sessions[0]!.revokedAt).not.toBeNull();
      expect(sessions[0]!.replacedById).toBe(sessions[1]!.id);
      expect(sessions[1]!.familyId).toBe(sessions[0]!.familyId);
    });

    it('treats an immediate second use of a rotated token as a race, not theft', async () => {
      const owner = await registerBusiness(app);
      const first = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', owner.refreshCookie)
        .expect(200);
      const race = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', owner.refreshCookie)
        .expect(401);
      expect(race.body.error.code).toBe('REFRESH_RACE');
      // The legitimate successor still works.
      await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', extractRefreshCookie(first.headers['set-cookie']))
        .expect(200);
    });

    it('detects reuse of a rotated token and revokes the whole session family', async () => {
      const owner = await registerBusiness(app);
      const rotatedRes = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', owner.refreshCookie)
        .expect(200);
      const successor = extractRefreshCookie(rotatedRes.headers['set-cookie']);

      // Age the rotation beyond the grace window, as if an attacker replayed a stolen token later.
      const prisma = prismaOf(app);
      await prisma.refreshSession.updateMany({
        where: { user: { email: owner.email }, replacedById: { not: null } },
        data: { revokedAt: new Date(Date.now() - 60_000) },
      });

      await http().post('/api/v1/auth/refresh').set('Cookie', owner.refreshCookie).expect(401);
      // The legitimate successor is now revoked as well, and so are its access tokens.
      await http().post('/api/v1/auth/refresh').set('Cookie', successor).expect(401);
      await http().get('/api/v1/auth/me').set(bearer(rotatedRes.body.data)).expect(401);

      const reuse = await prisma.auditLog.findFirst({
        where: { action: 'auth.refresh_reuse_detected', actor: { email: owner.email } },
      });
      expect(reuse).not.toBeNull();
    });

    it('rejects missing, unknown and revoked tokens and clears the cookie', async () => {
      await http().post('/api/v1/auth/refresh').expect(401);
      const unknown = await http()
        .post('/api/v1/auth/refresh')
        .set('Cookie', 'rea_refresh=not-a-real-token')
        .expect(401);
      expect(String(unknown.headers['set-cookie'])).toMatch(/rea_refresh=;/);

      const owner = await registerBusiness(app);
      await http().post('/api/v1/auth/logout').set('Cookie', owner.refreshCookie).expect(204);
      await http().post('/api/v1/auth/refresh').set('Cookie', owner.refreshCookie).expect(401);
    });

    it('rejects cross-site origins', async () => {
      const owner = await registerBusiness(app);
      const res = await http()
        .post('/api/v1/auth/refresh')
        .set('Origin', 'https://evil.example')
        .set('Cookie', owner.refreshCookie)
        .expect(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /auth/logout', () => {
    it('revokes the session, clears the cookie and invalidates the access token', async () => {
      const owner = await registerBusiness(app);
      await http().get('/api/v1/auth/me').set(bearer(owner)).expect(200);

      const res = await http()
        .post('/api/v1/auth/logout')
        .set('Cookie', owner.refreshCookie)
        .expect(204);
      expect(String(res.headers['set-cookie'])).toMatch(/rea_refresh=;.*Expires=Thu, 01 Jan 1970/);

      await http().get('/api/v1/auth/me').set(bearer(owner)).expect(401);
      const live = await prismaOf(app).refreshSession.count({
        where: { user: { email: owner.email }, revokedAt: null },
      });
      expect(live).toBe(0);
    });

    it('is idempotent without a cookie', async () => {
      await http().post('/api/v1/auth/logout').expect(204);
    });
  });

  describe('GET /auth/me and access tokens', () => {
    it('returns the user, active tenant and memberships', async () => {
      const owner = await registerBusiness(app, { businessName: 'Premium Property Consultants' });
      const res = await http().get('/api/v1/auth/me').set(bearer(owner)).expect(200);
      expect(res.body.data.user.email).toBe(owner.email);
      expect(res.body.data.activeTenant).toMatchObject({
        name: 'Premium Property Consultants',
        role: 'OWNER',
      });
      expect(res.body.data.memberships).toHaveLength(1);
    });

    it('requires a valid bearer token', async () => {
      await http().get('/api/v1/auth/me').expect(401);
      await http().get('/api/v1/auth/me').set('Authorization', 'Bearer not.a.jwt').expect(401);

      const owner = await registerBusiness(app);
      const [h, p, s] = owner.accessToken.split('.');
      const tampered = `${h}.${p}.${s!.slice(0, -2)}xx`;
      await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${tampered}`).expect(401);
    });
  });
});
