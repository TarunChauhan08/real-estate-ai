import { type INestApplication } from '@nestjs/common';
import request from 'supertest';
import { createTestApp } from './app.factory';
import {
  PASSWORD,
  addMemberAndLogin,
  bearer,
  extractRefreshCookie,
  login,
  registerBusiness,
  type TestSession,
  uniqueEmail,
} from './utils/auth';
import { prismaOf, resetDatabase } from './utils/db';

const tokenFrom = (url: string) => url.split('#token=')[1]!;

describe('Team management and invitations (e2e)', () => {
  let app: INestApplication;
  let owner: TestSession;
  let tenantId: string;
  const http = () => request(app.getHttpServer());

  function invite(session: TestSession, email: string, role: string) {
    return http().post('/api/v1/tenants/current/invitations').set(bearer(session)).send({ email, role });
  }

  async function memberIdOf(email: string, tid = tenantId): Promise<string> {
    const m = await prismaOf(app).membership.findFirstOrThrow({ where: { tenantId: tid, user: { email } } });
    return m.id;
  }

  beforeAll(async () => {
    app = await createTestApp();
    await resetDatabase(app);
    owner = await registerBusiness(app, { businessName: 'Team Realty', name: 'Olivia Owner' });
    tenantId = owner.activeTenant!.id;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('invitations', () => {
    it('creates an invitation, stores only the token hash and reports delivery honestly', async () => {
      const email = uniqueEmail('agent');
      const res = await invite(owner, email, 'SALES_AGENT').expect(201);

      expect(res.body.data.invitation).toMatchObject({ email, role: 'SALES_AGENT', status: 'PENDING' });
      expect(res.body.data.invitation.invitedBy.name).toBe('Olivia Owner');
      expect(res.body.data.delivery.status).toBe('not_sent');
      expect(res.body.data.delivery.devAcceptUrl).toMatch(/^http:\/\/localhost:3000\/accept-invitation#token=[\w-]{43}$/);

      const token = tokenFrom(res.body.data.delivery.devAcceptUrl);
      const stored = await prismaOf(app).invitation.findUniqueOrThrow({ where: { id: res.body.data.invitation.id } });
      expect(stored.tokenHash).toMatch(/^[0-9a-f]{64}$/);
      expect(stored.tokenHash).not.toContain(token);
      expect(JSON.stringify(res.body.data.invitation)).not.toContain('tokenHash');
    });

    it('previews and accepts an invitation as a new user, then refuses reuse', async () => {
      const email = uniqueEmail('newagent');
      const created = await invite(owner, email, 'SALES_AGENT').expect(201);
      const token = tokenFrom(created.body.data.delivery.devAcceptUrl);

      const preview = await http().post('/api/v1/invitations/preview').send({ token }).expect(200);
      expect(preview.body.data).toMatchObject({ tenantName: 'Team Realty', email, role: 'SALES_AGENT', accountExists: false });

      const weak = await http().post('/api/v1/invitations/accept').send({ token, name: 'New Agent', password: 'weak' }).expect(400);
      expect(weak.body.error.details[0].field).toBe('password');

      const accepted = await http()
        .post('/api/v1/invitations/accept')
        .send({ token, name: 'New Agent', password: PASSWORD })
        .expect(200);
      expect(accepted.body.data.activeTenant).toMatchObject({ id: tenantId, role: 'SALES_AGENT' });
      expect(String(accepted.headers['set-cookie'])).toMatch(/rea_refresh=/);
      await http().get('/api/v1/tenants/current').set(bearer(accepted.body.data)).expect(200);

      const reuse = await http().post('/api/v1/invitations/accept').send({ token, name: 'Again', password: PASSWORD }).expect(409);
      expect(reuse.body.error.code).toBe('INVITATION_USED');

      const listed = await http().get('/api/v1/tenants/current/invitations?status=ACCEPTED').set(bearer(owner)).expect(200);
      expect(listed.body.data.map((i: { email: string }) => i.email)).toContain(email);
    });

    it('lets an existing user (of another business) join after confirming their password', async () => {
      const other = await registerBusiness(app, { businessName: 'Other Business' });
      const created = await invite(owner, other.email, 'VIEWER').expect(201);
      const token = tokenFrom(created.body.data.delivery.devAcceptUrl);

      const preview = await http().post('/api/v1/invitations/preview').send({ token }).expect(200);
      expect(preview.body.data.accountExists).toBe(true);

      await http().post('/api/v1/invitations/accept').send({ token, password: 'Wr0ng-password' }).expect(401);
      const accepted = await http().post('/api/v1/invitations/accept').send({ token, password: PASSWORD }).expect(200);
      expect(accepted.body.data.activeTenant).toMatchObject({ id: tenantId, role: 'VIEWER' });

      const me = await http().get('/api/v1/auth/me').set(bearer(accepted.body.data)).expect(200);
      expect(me.body.data.memberships).toHaveLength(2);
    });

    it('rejects expired, revoked, superseded, unknown and malformed tokens', async () => {
      const email = uniqueEmail('expiring');
      const first = await invite(owner, email, 'VIEWER').expect(201);
      const firstToken = tokenFrom(first.body.data.delivery.devAcceptUrl);

      // Re-inviting the same email supersedes the first invitation.
      const second = await invite(owner, email, 'VIEWER').expect(201);
      const secondToken = tokenFrom(second.body.data.delivery.devAcceptUrl);
      const superseded = await http().post('/api/v1/invitations/preview').send({ token: firstToken }).expect(410);
      expect(superseded.body.error.code).toBe('INVITATION_REVOKED');

      await prismaOf(app).invitation.update({
        where: { id: second.body.data.invitation.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });
      const expired = await http()
        .post('/api/v1/invitations/accept')
        .send({ token: secondToken, name: 'Late', password: PASSWORD })
        .expect(410);
      expect(expired.body.error.code).toBe('INVITATION_EXPIRED');

      const unknown = await http().post('/api/v1/invitations/preview').send({ token: 'x'.repeat(43) }).expect(404);
      expect(unknown.body.error.code).toBe('INVITATION_INVALID');
      await http().post('/api/v1/invitations/preview').send({ token: 'bad token!' }).expect(400);
    });

    it('revokes a pending invitation', async () => {
      const created = await invite(owner, uniqueEmail('revoke'), 'MANAGER').expect(201);
      const id = created.body.data.invitation.id;
      const revoked = await http().post(`/api/v1/tenants/current/invitations/${id}/revoke`).set(bearer(owner)).expect(200);
      expect(revoked.body.data.status).toBe('REVOKED');
      await http().post(`/api/v1/tenants/current/invitations/${id}/revoke`).set(bearer(owner)).expect(409);

      const token = tokenFrom(created.body.data.delivery.devAcceptUrl);
      await http().post('/api/v1/invitations/accept').send({ token, name: 'Nope', password: PASSWORD }).expect(410);
    });

    it('enforces who can invite which role', async () => {
      const ownerInvite = await invite(owner, uniqueEmail(), 'OWNER').expect(403);
      expect(ownerInvite.body.error.code).toBe('ROLE_NOT_ASSIGNABLE');

      const admin = await addMemberAndLogin(app, tenantId, 'ADMIN');
      await invite(admin, uniqueEmail(), 'ADMIN').expect(403);
      await invite(admin, uniqueEmail(), 'MANAGER').expect(201);

      const manager = await addMemberAndLogin(app, tenantId, 'MANAGER');
      await invite(manager, uniqueEmail(), 'MANAGER').expect(403);
      await invite(manager, uniqueEmail(), 'SALES_AGENT').expect(201);

      const agent = await addMemberAndLogin(app, tenantId, 'SALES_AGENT');
      const agentInvite = await invite(agent, uniqueEmail(), 'VIEWER').expect(403);
      expect(agentInvite.body.error.code).toBe('FORBIDDEN');
    });

    it('refuses to invite an existing member and validates input', async () => {
      const dup = await invite(owner, owner.email, 'VIEWER').expect(409);
      expect(dup.body.error.code).toBe('ALREADY_MEMBER');
      await invite(owner, 'not-an-email', 'VIEWER').expect(400);
      await invite(owner, uniqueEmail(), 'SUPERUSER').expect(400);
    });
  });

  describe('members', () => {
    it('lists members with pagination, filters and search', async () => {
      const res = await http().get('/api/v1/tenants/current/members?pageSize=2').set(bearer(owner)).expect(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(4);
      expect(res.body.data[0]).toMatchObject({ email: owner.email, role: 'OWNER', isCurrentUser: true });
      expect(Object.keys(res.body.data[0]).sort()).toEqual(
        ['email', 'id', 'isCurrentUser', 'joinedAt', 'name', 'role', 'status', 'userId'].sort(),
      );

      const owners = await http().get('/api/v1/tenants/current/members?role=OWNER').set(bearer(owner)).expect(200);
      expect(owners.body.data).toHaveLength(1);
      const search = await http().get('/api/v1/tenants/current/members?q=olivia').set(bearer(owner)).expect(200);
      expect(search.body.data.map((m: { email: string }) => m.email)).toEqual([owner.email]);
    });

    it('owner can change roles; the change applies on the member’s next request', async () => {
      const agent = await addMemberAndLogin(app, tenantId, 'SALES_AGENT');
      await http().patch('/api/v1/tenants/current/settings').set(bearer(agent)).send({ locale: 'hi-IN' }).expect(403);

      const id = await memberIdOf(agent.email);
      const res = await http()
        .patch(`/api/v1/tenants/current/members/${id}/role`)
        .set(bearer(owner))
        .send({ role: 'MANAGER' })
        .expect(200);
      expect(res.body.data.role).toBe('MANAGER');

      // Same access token, new role from the database.
      await http().patch('/api/v1/tenants/current/settings').set(bearer(agent)).send({ locale: 'en-IN' }).expect(200);
      const audit = await prismaOf(app).auditLog.findFirst({ where: { action: 'member.role_changed', entityId: id } });
      expect(audit?.metadata).toMatchObject({ from: 'SALES_AGENT', to: 'MANAGER' });
    });

    it('blocks self-modification and privilege escalation', async () => {
      const ownerId = await memberIdOf(owner.email);
      const self = await http()
        .patch(`/api/v1/tenants/current/members/${ownerId}/role`)
        .set(bearer(owner))
        .send({ role: 'VIEWER' })
        .expect(403);
      expect(self.body.error.code).toBe('CANNOT_MODIFY_SELF');

      const admin = await addMemberAndLogin(app, tenantId, 'ADMIN');
      const adminId = await memberIdOf(admin.email);
      // An admin cannot promote themselves…
      await http().patch(`/api/v1/tenants/current/members/${adminId}/role`).set(bearer(admin)).send({ role: 'OWNER' }).expect(403);
      // …touch the owner…
      const onOwner = await http()
        .patch(`/api/v1/tenants/current/members/${ownerId}/status`)
        .set(bearer(admin))
        .send({ status: 'SUSPENDED' })
        .expect(403);
      expect(onOwner.body.error.code).toBe('INSUFFICIENT_ROLE');
      // …or grant ADMIN to someone else.
      const viewer = await addMemberAndLogin(app, tenantId, 'VIEWER');
      const viewerId = await memberIdOf(viewer.email);
      const grant = await http()
        .patch(`/api/v1/tenants/current/members/${viewerId}/role`)
        .set(bearer(admin))
        .send({ role: 'ADMIN' })
        .expect(403);
      expect(grant.body.error.code).toBe('ROLE_NOT_ASSIGNABLE');

      // A manager cannot manage another manager; agents and viewers cannot manage anyone.
      const manager = await addMemberAndLogin(app, tenantId, 'MANAGER');
      const manager2 = await addMemberAndLogin(app, tenantId, 'MANAGER');
      await http()
        .patch(`/api/v1/tenants/current/members/${await memberIdOf(manager2.email)}/role`)
        .set(bearer(manager))
        .send({ role: 'VIEWER' })
        .expect(403);
      await http().patch(`/api/v1/tenants/current/members/${viewerId}/role`).set(bearer(viewer)).send({ role: 'OWNER' }).expect(403);

      const roles = await prismaOf(app).membership.findMany({ where: { id: { in: [adminId, viewerId, ownerId] } } });
      expect(roles.map((r) => r.role).sort()).toEqual(['ADMIN', 'OWNER', 'VIEWER']);
    });

    it('owners may appoint and manage co-owners while one active owner always remains', async () => {
      const coOwner = await addMemberAndLogin(app, tenantId, 'ADMIN');
      const coOwnerId = await memberIdOf(coOwner.email);
      await http().patch(`/api/v1/tenants/current/members/${coOwnerId}/role`).set(bearer(owner)).send({ role: 'OWNER' }).expect(200);
      await http().patch(`/api/v1/tenants/current/members/${coOwnerId}/role`).set(bearer(owner)).send({ role: 'ADMIN' }).expect(200);

      const activeOwners = await prismaOf(app).membership.count({ where: { tenantId, role: 'OWNER', status: 'ACTIVE' } });
      expect(activeOwners).toBe(1);
    });

    it('suspends and reactivates a member', async () => {
      const agent = await addMemberAndLogin(app, tenantId, 'SALES_AGENT');
      const id = await memberIdOf(agent.email);

      const suspended = await http()
        .patch(`/api/v1/tenants/current/members/${id}/status`)
        .set(bearer(owner))
        .send({ status: 'SUSPENDED' })
        .expect(200);
      expect(suspended.body.data.status).toBe('SUSPENDED');
      await http().get('/api/v1/tenants/current').set(bearer(agent)).expect(401);
      const relogin = await login(app, agent.email);
      expect(relogin.activeTenant).toBeNull();

      await http().patch(`/api/v1/tenants/current/members/${id}/status`).set(bearer(owner)).send({ status: 'ACTIVE' }).expect(200);
      const refreshed = await http().post('/api/v1/auth/refresh').set('Cookie', relogin.refreshCookie).expect(200);
      expect(refreshed.body.data.activeTenant.id).toBe(tenantId);
      expect(extractRefreshCookie(refreshed.headers['set-cookie'])).toBeDefined();

      await http().patch(`/api/v1/tenants/current/members/${id}/status`).set(bearer(owner)).send({ status: 'INVITED' }).expect(400);
    });
  });

  describe('cross-tenant protection', () => {
    it('Business A cannot see, change or revoke anything in Business B', async () => {
      const b = await registerBusiness(app, { businessName: 'Business B' });
      const bAgent = await addMemberAndLogin(app, b.activeTenant!.id, 'SALES_AGENT');
      const bAgentId = await memberIdOf(bAgent.email, b.activeTenant!.id);
      const bInvite = await invite(b, uniqueEmail(), 'VIEWER').expect(201);

      const members = await http().get('/api/v1/tenants/current/members?pageSize=100').set(bearer(owner)).expect(200);
      expect(members.body.data.map((m: { id: string }) => m.id)).not.toContain(bAgentId);
      const invitations = await http().get('/api/v1/tenants/current/invitations?pageSize=100').set(bearer(owner)).expect(200);
      expect(invitations.body.data.map((i: { id: string }) => i.id)).not.toContain(bInvite.body.data.invitation.id);

      const role = await http()
        .patch(`/api/v1/tenants/current/members/${bAgentId}/role`)
        .set(bearer(owner))
        .send({ role: 'VIEWER' })
        .expect(404);
      expect(role.body.error.code).toBe('NOT_FOUND');
      await http()
        .patch(`/api/v1/tenants/current/members/${bAgentId}/status`)
        .set(bearer(owner))
        .send({ status: 'SUSPENDED' })
        .expect(404);
      await http()
        .post(`/api/v1/tenants/current/invitations/${bInvite.body.data.invitation.id}/revoke`)
        .set(bearer(owner))
        .expect(404);

      const untouched = await prismaOf(app).membership.findUniqueOrThrow({ where: { id: bAgentId } });
      expect(untouched).toMatchObject({ role: 'SALES_AGENT', status: 'ACTIVE' });
      const invitation = await prismaOf(app).invitation.findUniqueOrThrow({ where: { id: bInvite.body.data.invitation.id } });
      expect(invitation.revokedAt).toBeNull();
    });

    it('returns 404 for malformed member IDs', async () => {
      await http().patch('/api/v1/tenants/current/members/not-a-uuid/role').set(bearer(owner)).send({ role: 'VIEWER' }).expect(404);
    });
  });
});
