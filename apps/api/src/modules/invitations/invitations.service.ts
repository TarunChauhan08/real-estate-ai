import { HttpStatus, Injectable } from '@nestjs/common';
import {
  type CreateInvitationResponse,
  type InvitationDto,
  type InvitationPreview,
  type InvitationStatus,
  invitableRoles,
} from '@rea/shared-types';
import { AppException, Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { generateToken, sha256Hex } from '../../common/utils/crypto';
import { passwordPolicyViolations } from '../../common/validation/password';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { MembershipStatus, TenantStatus, UserStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { AuthService, type IssuedAuth } from '../auth/auth.service';
import { PasswordService } from '../auth/password.service';
import { type AcceptInvitationDto } from './dto/accept-invitation.dto';
import { type CreateInvitationDto } from './dto/create-invitation.dto';
import { type InvitationQueryDto } from './dto/invitation-query.dto';
import { InvitationDeliveryService } from './invitation-delivery.service';

const invitationSelect = {
  id: true,
  email: true,
  role: true,
  expiresAt: true,
  acceptedAt: true,
  revokedAt: true,
  createdAt: true,
  invitedBy: { select: { id: true, name: true } },
} as const satisfies Prisma.InvitationSelect;

type InvitationRow = Prisma.InvitationGetPayload<{ select: typeof invitationSelect }>;

function statusOf(row: { acceptedAt: Date | null; revokedAt: Date | null; expiresAt: Date }, now = new Date()): InvitationStatus {
  if (row.acceptedAt) return 'ACCEPTED';
  if (row.revokedAt) return 'REVOKED';
  if (row.expiresAt <= now) return 'EXPIRED';
  return 'PENDING';
}

function statusFilter(status: InvitationStatus | undefined, now: Date): Prisma.InvitationWhereInput {
  switch (status) {
    case 'ACCEPTED':
      return { acceptedAt: { not: null } };
    case 'REVOKED':
      return { acceptedAt: null, revokedAt: { not: null } };
    case 'EXPIRED':
      return { acceptedAt: null, revokedAt: null, expiresAt: { lte: now } };
    case 'PENDING':
      return { acceptedAt: null, revokedAt: null, expiresAt: { gt: now } };
    default:
      return {};
  }
}

const invalidInvitation = () =>
  new AppException(HttpStatus.NOT_FOUND, 'INVITATION_INVALID', 'This invitation link is invalid');

/**
 * Invitations: random 256-bit tokens, only SHA-256 hashes stored, expiry, single use,
 * email-bound, and membership created transactionally on acceptance.
 */
@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly config: AppConfigService,
    private readonly delivery: InvitationDeliveryService,
    private readonly passwords: PasswordService,
    private readonly auth: AuthService,
  ) {}

  async create(ctx: TenantContext, actorId: string, dto: CreateInvitationDto): Promise<CreateInvitationResponse> {
    if (!invitableRoles(ctx.role).includes(dto.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'ROLE_NOT_ASSIGNABLE', 'You cannot invite members with this role');
    }
    const existingMember = await this.prisma.membership.findFirst({
      where: { tenantId: ctx.tenantId, user: { email: dto.email } },
      select: { id: true },
    });
    if (existingMember) throw Errors.conflict('ALREADY_MEMBER', 'This person is already a member of your business');

    const token = generateToken(32);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.config.get('INVITATION_TTL_HOURS') * 60 * 60 * 1000);

    const invitation = await this.prisma.$transaction(async (tx) => {
      // A new invitation supersedes any still-pending one for the same email.
      await tx.invitation.updateMany({
        where: { tenantId: ctx.tenantId, email: dto.email, acceptedAt: null, revokedAt: null },
        data: { revokedAt: now },
      });
      const created = await tx.invitation.create({
        data: {
          tenantId: ctx.tenantId,
          email: dto.email,
          role: dto.role,
          tokenHash: sha256Hex(token),
          invitedById: actorId,
          expiresAt,
        },
        select: invitationSelect,
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.INVITATION_CREATED,
          entityType: 'invitation',
          entityId: created.id,
          metadata: { email: dto.email, role: dto.role },
        },
        tx,
      );
      return created;
    });

    return { invitation: this.toDto(invitation), delivery: this.delivery.deliver(token) };
  }

  async list(ctx: TenantContext, query: InvitationQueryDto): Promise<Paginated<InvitationDto>> {
    const now = new Date();
    const where: Prisma.InvitationWhereInput = { tenantId: ctx.tenantId, ...statusFilter(query.status, now) };
    const [rows, total] = await Promise.all([
      this.prisma.invitation.findMany({
        where,
        select: invitationSelect,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.invitation.count({ where }),
    ]);
    return Paginated.of(
      rows.map((row) => this.toDto(row, now)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async revoke(ctx: TenantContext, actorId: string, invitationId: string): Promise<InvitationDto> {
    const invitation = await this.prisma.invitation.findFirst({
      where: { id: invitationId, tenantId: ctx.tenantId },
      select: invitationSelect,
    });
    if (!invitation) throw Errors.notFound('Invitation');
    if (!invitableRoles(ctx.role).includes(invitation.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'ROLE_NOT_ASSIGNABLE', 'You cannot manage invitations for this role');
    }
    if (statusOf(invitation) !== 'PENDING') {
      throw Errors.conflict('INVITATION_NOT_PENDING', 'Only pending invitations can be revoked');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.invitation.update({
        where: { id: invitation.id },
        data: { revokedAt: new Date() },
        select: invitationSelect,
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.INVITATION_REVOKED,
          entityType: 'invitation',
          entityId: invitation.id,
          metadata: { email: invitation.email, role: invitation.role },
        },
        tx,
      );
      return this.toDto(updated);
    });
  }

  /** Public: what the invitation is for, so the accept page can show the right form. */
  async preview(token: string): Promise<InvitationPreview> {
    const invitation = await this.findUsable(token);
    const user = await this.prisma.user.findUnique({ where: { email: invitation.email }, select: { id: true } });
    return {
      tenantName: invitation.tenant.name,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString(),
      accountExists: user !== null,
    };
  }

  /**
   * Public: accepts an invitation. New invitees create their account; existing users prove
   * ownership of the invited email by entering their current password. The invitation is
   * consumed and the membership created in one transaction.
   */
  async accept(dto: AcceptInvitationDto, meta: { userAgent?: string }): Promise<IssuedAuth> {
    const invitation = await this.findUsable(dto.token);
    const existingUser = await this.prisma.user.findUnique({
      where: { email: invitation.email },
      select: { id: true, passwordHash: true, status: true },
    });

    let newUserPasswordHash: string | null = null;
    if (existingUser) {
      if (!(await this.passwords.verify(existingUser.passwordHash, dto.password))) throw Errors.invalidCredentials();
      if (existingUser.status !== UserStatus.ACTIVE) {
        throw new AppException(HttpStatus.FORBIDDEN, 'ACCOUNT_DISABLED', 'This account has been disabled');
      }
    } else {
      const problems = passwordPolicyViolations(dto.password).map((message) => ({ field: 'password', message }));
      if (!dto.name) problems.push({ field: 'name', message: 'Name is required to create your account' });
      if (problems.length > 0) throw Errors.validation(problems);
      newUserPasswordHash = await this.passwords.hash(dto.password);
    }

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        // Single use: only one request can flip acceptedAt from null.
        const { count } = await tx.invitation.updateMany({
          where: { id: invitation.id, acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
          data: { acceptedAt: new Date() },
        });
        if (count !== 1) throw Errors.conflict('INVITATION_USED', 'This invitation has already been used');

        const userId =
          existingUser?.id ??
          (
            await tx.user.create({
              data: { name: dto.name!, email: invitation.email, passwordHash: newUserPasswordHash!, status: UserStatus.ACTIVE },
              select: { id: true },
            })
          ).id;

        const membership = await tx.membership.create({
          data: { tenantId: invitation.tenantId, userId, role: invitation.role, status: MembershipStatus.ACTIVE },
          select: { id: true, tenantId: true, role: true },
        });
        await this.audit.record(
          {
            tenantId: invitation.tenantId,
            actorId: userId,
            action: AuditAction.INVITATION_ACCEPTED,
            entityType: 'invitation',
            entityId: invitation.id,
            metadata: { role: invitation.role, newAccount: !existingUser, membershipId: membership.id },
          },
          tx,
        );
        return { userId, context: { tenantId: membership.tenantId, membershipId: membership.id, role: membership.role } };
      });

      return await this.auth.startSession(result.userId, result.context, meta);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw Errors.conflict('ALREADY_MEMBER', 'You are already a member of this business');
      }
      throw error;
    }
  }

  private async findUsable(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: { tokenHash: sha256Hex(token) },
      select: {
        id: true,
        tenantId: true,
        email: true,
        role: true,
        expiresAt: true,
        acceptedAt: true,
        revokedAt: true,
        tenant: { select: { name: true, status: true } },
      },
    });
    if (!invitation) throw invalidInvitation();
    switch (statusOf(invitation)) {
      case 'ACCEPTED':
        throw Errors.conflict('INVITATION_USED', 'This invitation has already been used');
      case 'REVOKED':
        throw new AppException(HttpStatus.GONE, 'INVITATION_REVOKED', 'This invitation has been withdrawn');
      case 'EXPIRED':
        throw new AppException(HttpStatus.GONE, 'INVITATION_EXPIRED', 'This invitation has expired. Ask for a new one.');
      default:
        break;
    }
    if (invitation.tenant.status === TenantStatus.SUSPENDED) {
      throw Errors.forbidden('This business is not accepting new members');
    }
    return invitation;
  }

  private toDto(row: InvitationRow, now = new Date()): InvitationDto {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      status: statusOf(row, now),
      invitedBy: row.invitedBy,
      expiresAt: row.expiresAt.toISOString(),
      acceptedAt: row.acceptedAt?.toISOString() ?? null,
      revokedAt: row.revokedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
