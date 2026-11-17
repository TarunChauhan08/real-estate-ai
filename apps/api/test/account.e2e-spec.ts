import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { type FakeMailer, MAILER } from '../src/modules/mail/mailer';
import { createTestApp } from './app.factory';
import { bearer, PASSWORD, registerBusiness, type TestSession } from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

/** The token from the link in an email (links carry it after `#token=`). */
function tokenFrom(text: string | undefined): string {
  const match = /#token=([A-Za-z0-9_-]+)/.exec(text ?? '');
  if (!match) throw new Error('No link in email');
  return match[1]!;
}

/**
 * Account security end to end: verification on sign-up, forgotten password, password change.
 * Emails go to the in-memory fake mailer; links are read from it like a person would.
 */
describe('Account security (e2e)', () => {
  let app: INestApplication;
  let owner: TestSession;
  let password = PASSWORD;
  let mail: FakeMailer;
  const http = () => request(app.getHttpServer());

  const login = (email: string, password: string) =>
    http().post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    mail = app.get<FakeMailer>(MAILER);
    owner = await registerBusiness(app, { businessName: 'Secure Realty' });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('email verification', () => {
    it('sends a verification email on sign-up and reports the address as unverified', async () => {
      const email = mail.lastTo(owner.email);
      expect(email?.subject).toBe('Confirm your email address');
      expect(email?.text).toMatch(/\/verify-email#token=/);
      const me = await http().get('/api/v1/auth/me').set(bearer(owner)).expect(200);
      expect(me.body.data.user.emailVerified).toBe(false);
    });

    it('verifies with the emailed link, once', async () => {
      const token = tokenFrom(mail.lastTo(owner.email)?.text);
      await http().post('/api/v1/auth/email/verify').send({ token }).expect(204);
      const me = await http().get('/api/v1/auth/me').set(bearer(owner)).expect(200);
      expect(me.body.data.user.emailVerified).toBe(true);

      const again = await http().post('/api/v1/auth/email/verify').send({ token }).expect(400);
      expect(again.body.error.code).toBe('INVALID_OR_EXPIRED_LINK');
    });

    it('does not resend once verified', async () => {
      const before = mail.sent.length;
      const res = await http()
        .post('/api/v1/auth/email/send-verification')
        .set(bearer(owner))
        .expect(200);
      expect(res.body.data).toEqual({ alreadyVerified: true });
      expect(mail.sent.length).toBe(before);
    });

    it('a newer link replaces the older one', async () => {
      const other = await registerBusiness(app, { businessName: 'Resend Realty' });
      const first = tokenFrom(mail.lastTo(other.email)?.text);
      await http().post('/api/v1/auth/email/send-verification').set(bearer(other)).expect(200);
      const second = tokenFrom(mail.lastTo(other.email)?.text);
      expect(second).not.toBe(first);
      await http().post('/api/v1/auth/email/verify').send({ token: first }).expect(400);
      await http().post('/api/v1/auth/email/verify').send({ token: second }).expect(204);
    });
  });

  describe('forgotten password', () => {
    it('answers the same way whether or not the account exists', async () => {
      const before = mail.sent.length;
      const unknown = await http()
        .post('/api/v1/auth/password/forgot')
        .send({ email: 'nobody@example.com' })
        .expect(202);
      expect(mail.sent.length).toBe(before);
      const known = await http()
        .post('/api/v1/auth/password/forgot')
        .send({ email: owner.email.toUpperCase() })
        .expect(202);
      expect(known.body).toEqual(unknown.body);
      expect(mail.lastTo(owner.email)?.subject).toBe('Reset your password');
    });

    it('resets the password, signs out every device, and the link works once', async () => {
      const token = tokenFrom(mail.lastTo(owner.email)?.text);
      const weak = await http()
        .post('/api/v1/auth/password/reset')
        .send({ token, password: 'short' })
        .expect(400);
      expect(weak.body.error.details[0].field).toBe('password');

      await http()
        .post('/api/v1/auth/password/reset')
        .send({ token, password: 'BrandNewPassw0rd' })
        .expect(204);

      // Old refresh sessions no longer work.
      const sessions = await prismaOf(app).refreshSession.findMany({
        where: { user: { email: owner.email } },
      });
      expect(sessions.every((s) => s.revokedAt !== null)).toBe(true);

      await login(owner.email, password).expect(401);
      const fresh = await login(owner.email, 'BrandNewPassw0rd').expect(200);
      owner = { ...owner, accessToken: fresh.body.data.accessToken };
      password = 'BrandNewPassw0rd';

      const reuse = await http()
        .post('/api/v1/auth/password/reset')
        .send({ token, password: 'AnotherPassw0rd1' })
        .expect(400);
      expect(reuse.body.error.code).toBe('INVALID_OR_EXPIRED_LINK');
    });

    it('expired links are refused', async () => {
      await http().post('/api/v1/auth/password/forgot').send({ email: owner.email }).expect(202);
      const token = tokenFrom(mail.lastTo(owner.email)?.text);
      await prismaOf(app).userToken.updateMany({
        where: { user: { email: owner.email }, usedAt: null },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      await http()
        .post('/api/v1/auth/password/reset')
        .send({ token, password: 'ExpiredPassw0rd1' })
        .expect(400);
    });

    it('a verification link cannot be used to reset a password', async () => {
      const other = await registerBusiness(app, { businessName: 'Mixup Realty' });
      const verifyToken = tokenFrom(mail.lastTo(other.email)?.text);
      await http()
        .post('/api/v1/auth/password/reset')
        .send({ token: verifyToken, password: 'MixedUpPassw0rd1' })
        .expect(400);
    });

    it('never puts the token in the audit log', async () => {
      const logs = await prismaOf(app).auditLog.findMany({
        where: { action: { startsWith: 'auth.password' } },
      });
      expect(logs.length).toBeGreaterThan(0);
      expect(JSON.stringify(logs)).not.toMatch(/token=/);
    });
  });

  describe('changing the password', () => {
    it('requires the current password and keeps this device signed in', async () => {
      const wrong = await http()
        .post('/api/v1/auth/password/change')
        .set(bearer(owner))
        .send({ currentPassword: 'not-it', newPassword: 'ChangedPassw0rd1' })
        .expect(400);
      expect(wrong.body.error.details[0].field).toBe('currentPassword');

      const same = await http()
        .post('/api/v1/auth/password/change')
        .set(bearer(owner))
        .send({ currentPassword: password, newPassword: password })
        .expect(400);
      expect(same.body.error.details[0].field).toBe('newPassword');

      // A second device signs in first.
      await login(owner.email, password).expect(200);

      await http()
        .post('/api/v1/auth/password/change')
        .set(bearer(owner))
        .send({ currentPassword: password, newPassword: 'ChangedPassw0rd1' })
        .expect(204);

      await http().get('/api/v1/auth/me').set(bearer(owner)).expect(200);
      const active = await prismaOf(app).refreshSession.count({
        where: { user: { email: owner.email }, revokedAt: null },
      });
      expect(active).toBe(1);
      await login(owner.email, 'ChangedPassw0rd1').expect(200);
    });

    it('requires signing in', async () => {
      await http()
        .post('/api/v1/auth/password/change')
        .send({ currentPassword: 'x', newPassword: 'ChangedPassw0rd1' })
        .expect(401);
    });
  });
});
