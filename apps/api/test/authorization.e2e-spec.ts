import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import { addMemberAndLogin, bearer, registerBusiness, type TestSession } from './utils/auth';
import { resetDatabase } from './utils/db';

type Role = 'OWNER' | 'ADMIN' | 'MANAGER' | 'SALES_AGENT' | 'VIEWER';

/**
 * Backend role enforcement for every Phase 1 tenant endpoint.
 * `true` = allowed (2xx), `false` = 403. The frontend is never trusted to hide controls.
 */
const MATRIX: Array<{ name: string; method: 'get' | 'patch'; path: string; body?: object; allowed: Role[] }> = [
  { name: 'read business', method: 'get', path: '/tenants/current', allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'] },
  { name: 'rename business', method: 'patch', path: '/tenants/current', body: { name: 'Renamed Realty' }, allowed: ['OWNER', 'ADMIN'] },
  { name: 'read profile', method: 'get', path: '/tenants/current/profile', allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'] },
  { name: 'update profile', method: 'patch', path: '/tenants/current/profile', body: { city: 'Noida' }, allowed: ['OWNER', 'ADMIN'] },
  { name: 'read settings', method: 'get', path: '/tenants/current/settings', allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'] },
  { name: 'update settings', method: 'patch', path: '/tenants/current/settings', body: { preferredLanguage: 'hi' }, allowed: ['OWNER', 'ADMIN', 'MANAGER'] },
  { name: 'dashboard', method: 'get', path: '/dashboard/overview', allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'] },
  { name: 'audit logs', method: 'get', path: '/audit-logs', allowed: ['OWNER', 'ADMIN'] },
  { name: 'list members', method: 'get', path: '/tenants/current/members', allowed: ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'] },
  { name: 'list invitations', method: 'get', path: '/tenants/current/invitations', allowed: ['OWNER', 'ADMIN', 'MANAGER'] },
];

const ROLES: Role[] = ['OWNER', 'ADMIN', 'MANAGER', 'SALES_AGENT', 'VIEWER'];

describe('Role-based authorization (e2e)', () => {
  let app: INestApplication;
  const sessions = {} as Record<Role, TestSession>;

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    sessions.OWNER = await registerBusiness(app, { businessName: 'Matrix Realty' });
    const tenantId = sessions.OWNER.activeTenant!.id;
    for (const role of ROLES.slice(1)) sessions[role] = await addMemberAndLogin(app, tenantId, role);
  });

  afterAll(async () => {
    await app.close();
  });

  const cases = MATRIX.flatMap((rule) => ROLES.map((role) => [rule.name, role, rule.allowed.includes(role), rule] as const));

  it.each(cases)('%s as %s → allowed=%s', async (_name, role, allowed, rule) => {
    const req = request(app.getHttpServer())[rule.method](`/api/v1${rule.path}`).set(bearer(sessions[role]));
    const res = await (rule.body ? req.send(rule.body) : req);
    if (allowed) {
      expect(res.status).toBeLessThan(300);
    } else {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });

  it('every protected route rejects anonymous requests', async () => {
    for (const rule of MATRIX) {
      const res = await request(app.getHttpServer())[rule.method](`/api/v1${rule.path}`);
      expect(res.status).toBe(401);
    }
  });
});
