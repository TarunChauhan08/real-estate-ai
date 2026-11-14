import { randomUUID } from 'node:crypto';
import { type INestApplication } from '@nestjs/common';
import { type SessionResponse } from '@rea/shared-types';
import request from 'supertest';

export const PASSWORD = 'Str0ng-Passw0rd!';

export interface TestSession extends SessionResponse {
  /** Raw `rea_refresh=...` cookie pair, ready to send back. */
  refreshCookie: string;
  email: string;
}

export function extractRefreshCookie(setCookie: string[] | string | undefined): string {
  const cookies = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  const cookie = cookies.find((c) => c.startsWith('rea_refresh='));
  if (!cookie) throw new Error('No refresh cookie in response');
  return cookie.split(';')[0]!;
}

export function uniqueEmail(prefix = 'owner'): string {
  return `${prefix}.${randomUUID().slice(0, 8)}@example.com`;
}

export async function registerBusiness(
  app: INestApplication,
  overrides: Partial<{
    name: string;
    email: string;
    businessName: string;
    businessType: string;
  }> = {},
): Promise<TestSession> {
  const email = overrides.email ?? uniqueEmail();
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/register')
    .send({
      name: overrides.name ?? 'Test Owner',
      email,
      password: PASSWORD,
      businessName: overrides.businessName ?? 'Test Realty',
      businessType: overrides.businessType ?? 'BROKERAGE',
      acceptTerms: true,
    })
    .expect(201);
  return {
    ...(res.body.data as SessionResponse),
    refreshCookie: extractRefreshCookie(res.headers['set-cookie']),
    email,
  };
}

export async function login(
  app: INestApplication,
  email: string,
  password = PASSWORD,
): Promise<TestSession> {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);
  return {
    ...(res.body.data as SessionResponse),
    refreshCookie: extractRefreshCookie(res.headers['set-cookie']),
    email,
  };
}

export const bearer = (session: { accessToken: string }) => ({
  Authorization: `Bearer ${session.accessToken}`,
});

/**
 * Adds a user with the given role directly to a tenant (bypassing invitations) and signs them in.
 * Used to exercise the permission matrix.
 */
export async function addMemberAndLogin(
  app: INestApplication,
  tenantId: string,
  role: 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES_AGENT' | 'VIEWER',
): Promise<TestSession> {
  const { PasswordService } = await import('../../src/modules/auth/password.service');
  const { PrismaService } = await import('../../src/database/prisma.service');
  const prisma = app.get(PrismaService);
  const email = uniqueEmail(role.toLowerCase());
  const user = await prisma.user.create({
    data: {
      name: `Test ${role}`,
      email,
      passwordHash: await app.get(PasswordService).hash(PASSWORD),
    },
  });
  await prisma.membership.create({ data: { tenantId, userId: user.id, role } });
  return login(app, email);
}
