import { Injectable } from '@nestjs/common';
import { type ActiveTenant, type MeResponse, type SessionResponse } from '@rea/shared-types';
import { AppException, Errors } from '../../common/errors/app.exception';
import { uniqueSlug } from '../../common/utils/slug';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { MembershipRole, TenantStatus, UserStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { MembershipsService } from '../memberships/memberships.service';
import { type AuthContext, type TenantContext } from './auth-context';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { PasswordService } from './password.service';
import { SessionsService } from './sessions.service';
import { TokenService } from './token.service';

/** Session plus the raw refresh token, which the controller moves into an HttpOnly cookie. */
export interface IssuedAuth {
  session: SessionResponse;
  refreshToken: string;
}

interface RequestMeta {
  userAgent?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokenService,
    private readonly sessions: SessionsService,
    private readonly memberships: MembershipsService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Creates the owner user, tenant, business profile, settings, OWNER membership and first
   * refresh session in a single transaction — either everything exists afterwards or nothing does.
   */
  async register(dto: RegisterDto, meta: RequestMeta): Promise<IssuedAuth> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email }, select: { id: true } });
    if (existing) throw Errors.conflict('EMAIL_TAKEN', 'An account with this email already exists');

    const passwordHash = await this.passwords.hash(dto.password);

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { name: dto.name, email: dto.email, passwordHash, status: UserStatus.ACTIVE, lastLoginAt: new Date() },
          select: { id: true },
        });
        const tenant = await tx.tenant.create({
          data: { name: dto.businessName, slug: uniqueSlug(dto.businessName), status: TenantStatus.PENDING },
          select: { id: true },
        });
        await tx.businessProfile.create({ data: { tenantId: tenant.id, businessType: dto.businessType } });
        await tx.tenantSettings.create({ data: { tenantId: tenant.id } });
        const membership = await tx.membership.create({
          data: { tenantId: tenant.id, userId: user.id, role: MembershipRole.OWNER },
          select: { id: true },
        });
        const issued = await this.sessions.create(
          { userId: user.id, tenantId: tenant.id, userAgent: meta.userAgent },
          tx,
        );

        await this.audit.record(
          {
            tenantId: tenant.id,
            actorId: user.id,
            action: AuditAction.TENANT_CREATED,
            entityType: 'tenant',
            entityId: tenant.id,
            metadata: { name: dto.businessName, businessType: dto.businessType },
          },
          tx,
        );
        await this.audit.record(
          {
            tenantId: tenant.id,
            actorId: user.id,
            action: AuditAction.AUTH_REGISTERED,
            entityType: 'user',
            entityId: user.id,
          },
          tx,
        );

        const context: TenantContext = { tenantId: tenant.id, membershipId: membership.id, role: MembershipRole.OWNER };
        return { userId: user.id, familyId: issued.familyId, refreshToken: issued.refreshToken, context };
      });

      return {
        session: await this.buildSession(result.userId, result.familyId, result.context),
        refreshToken: result.refreshToken,
      };
    } catch (error) {
      // Two concurrent registrations with the same email: the unique index decides.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw Errors.conflict('EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
  }

  async login(dto: LoginDto, meta: RequestMeta): Promise<IssuedAuth> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true, passwordHash: true, status: true },
    });

    const valid = user
      ? await this.passwords.verify(user.passwordHash, dto.password)
      : await this.passwords.verifyAgainstDummy(dto.password);

    if (!user || !valid) {
      if (user) {
        await this.audit.recordSafely({
          tenantId: null,
          actorId: user.id,
          action: AuditAction.AUTH_LOGIN_FAILED,
          entityType: 'user',
          entityId: user.id,
        });
      }
      throw Errors.invalidCredentials();
    }
    // Status is only revealed after the password has been verified.
    if (user.status !== UserStatus.ACTIVE) {
      throw new AppException(403, 'ACCOUNT_DISABLED', 'This account has been disabled. Contact your administrator.');
    }

    const context = await this.memberships.resolveForSession(user.id);
    const issued = await this.sessions.create({
      userId: user.id,
      tenantId: context?.tenantId ?? null,
      userAgent: meta.userAgent,
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await this.audit.recordSafely({
      tenantId: context?.tenantId ?? null,
      actorId: user.id,
      action: AuditAction.AUTH_LOGIN,
      entityType: 'user',
      entityId: user.id,
    });

    return { session: await this.buildSession(user.id, issued.familyId, context), refreshToken: issued.refreshToken };
  }

  /** Rotates the refresh token and re-resolves tenant context from current memberships. */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<IssuedAuth> {
    const rotated = await this.sessions.rotate(refreshToken, meta.userAgent);

    if (!(await this.memberships.isUserActive(rotated.userId))) {
      await this.sessions.revokeFamily(rotated.familyId);
      throw Errors.unauthenticated('Session is no longer valid');
    }

    const context = await this.memberships.resolveForSession(rotated.userId, rotated.tenantId);
    if ((context?.tenantId ?? null) !== rotated.tenantId) {
      await this.sessions.setTenant(rotated.familyId, context?.tenantId ?? null);
    }

    return {
      session: await this.buildSession(rotated.userId, rotated.familyId, context),
      refreshToken: rotated.refreshToken,
    };
  }

  async logout(refreshToken: string | undefined, auth?: AuthContext): Promise<void> {
    let revoked: { userId: string; tenantId: string | null } | null = null;
    if (refreshToken) revoked = await this.sessions.revokeByToken(refreshToken);
    else if (auth) {
      await this.sessions.revokeFamily(auth.familyId);
      revoked = { userId: auth.userId, tenantId: auth.tenant?.tenantId ?? null };
    }
    if (revoked) {
      await this.audit.recordSafely({
        tenantId: revoked.tenantId,
        actorId: revoked.userId,
        action: AuditAction.AUTH_LOGOUT,
        entityType: 'user',
        entityId: revoked.userId,
      });
    }
  }

  /** Moves the current login session into another tenant the user is an active member of. */
  async switchTenant(auth: AuthContext, tenantId: string): Promise<SessionResponse> {
    const context = await this.memberships.resolveForSession(auth.userId, tenantId);
    // resolveForSession falls back to another tenant; switching requires the exact one.
    if (!context || context.tenantId !== tenantId) throw Errors.forbidden('You are not an active member of that business');

    await this.sessions.setTenant(auth.familyId, tenantId);
    await this.audit.recordSafely({
      tenantId,
      actorId: auth.userId,
      action: AuditAction.AUTH_TENANT_SWITCHED,
      entityType: 'tenant',
      entityId: tenantId,
      metadata: { fromTenantId: auth.tenant?.tenantId ?? null },
    });
    return this.buildSession(auth.userId, auth.familyId, context);
  }

  async me(auth: AuthContext): Promise<MeResponse> {
    const [user, activeTenant, memberships] = await Promise.all([
      this.loadUser(auth.userId),
      this.loadActiveTenant(auth.tenant),
      this.memberships.listUsable(auth.userId),
    ]);
    return {
      user,
      activeTenant,
      memberships: memberships.map((m) => ({ membershipId: m.id, role: m.role, tenant: m.tenant })),
    };
  }

  private async buildSession(userId: string, familyId: string, context: TenantContext | null): Promise<SessionResponse> {
    const [user, activeTenant, accessToken] = await Promise.all([
      this.loadUser(userId),
      this.loadActiveTenant(context),
      this.tokens.signAccessToken({
        sub: userId,
        fam: familyId,
        tid: context?.tenantId ?? null,
        mid: context?.membershipId ?? null,
      }),
    ]);
    return { accessToken, expiresIn: this.tokens.accessTtlSeconds, user, activeTenant };
  }

  private async loadUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });
    if (!user) throw Errors.unauthenticated();
    return user;
  }

  private async loadActiveTenant(context: TenantContext | null): Promise<ActiveTenant | null> {
    if (!context) return null;
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: context.tenantId },
      select: { id: true, name: true, slug: true, status: true },
    });
    return tenant ? { ...tenant, membershipId: context.membershipId, role: context.role } : null;
  }
}
