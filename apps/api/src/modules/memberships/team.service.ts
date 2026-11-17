import { HttpStatus, Injectable } from '@nestjs/common';
import { canAssignRole, canManageRole, type MemberDto } from '@rea/shared-types';
import { AppException, Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { MembershipRole, MembershipStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { type MemberQueryDto } from './dto/member-query.dto';

const memberSelect = {
  id: true,
  userId: true,
  role: true,
  status: true,
  createdAt: true,
  user: { select: { name: true, email: true } },
} as const satisfies Prisma.MembershipSelect;

type MemberRow = Prisma.MembershipGetPayload<{ select: typeof memberSelect }>;

/**
 * Team management for the active tenant.
 *
 * Rules enforced here (never in the UI alone):
 * - Members cannot change their own role or status (no self-escalation, no self-lockout).
 * - An actor may only manage members ranked below them, and only grant roles ranked below
 *   their own; OWNERs may manage other owners and grant OWNER.
 * - The last active OWNER can never be demoted or suspended.
 * - Every lookup is scoped by the caller's tenant, so foreign membership IDs are 404s.
 */
@Injectable()
export class TeamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: TenantContext, actorId: string, query: MemberQueryDto): Promise<Paginated<MemberDto>> {
    const where: Prisma.MembershipWhereInput = {
      tenantId: ctx.tenantId,
      role: query.role,
      status: query.status,
      user: query.q
        ? {
            OR: [
              { name: { contains: query.q, mode: 'insensitive' } },
              { email: { contains: query.q, mode: 'insensitive' } },
            ],
          }
        : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        select: memberSelect,
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.membership.count({ where }),
    ]);
    return Paginated.of(
      rows.map((row) => this.toDto(row, actorId)),
      total,
      query.page,
      query.pageSize,
    );
  }

  async changeRole(ctx: TenantContext, actorId: string, membershipId: string, role: MembershipRole): Promise<MemberDto> {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.findManageableTarget(tx, ctx, actorId, membershipId);
      if (!canAssignRole(ctx.role, role)) {
        throw new AppException(HttpStatus.FORBIDDEN, 'ROLE_NOT_ASSIGNABLE', 'You cannot assign this role');
      }
      if (target.role === role) return this.toDto(target, actorId);
      if (target.role === MembershipRole.OWNER) await this.assertAnotherActiveOwner(tx, ctx.tenantId, target.id);

      const updated = await tx.membership.update({ where: { id: target.id }, data: { role }, select: memberSelect });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.MEMBER_ROLE_CHANGED,
          entityType: 'membership',
          entityId: target.id,
          metadata: { userId: target.userId, from: target.role, to: role },
        },
        tx,
      );
      return this.toDto(updated, actorId);
    });
  }

  async changeStatus(
    ctx: TenantContext,
    actorId: string,
    membershipId: string,
    status: typeof MembershipStatus.ACTIVE | typeof MembershipStatus.SUSPENDED,
  ): Promise<MemberDto> {
    return this.prisma.$transaction(async (tx) => {
      const target = await this.findManageableTarget(tx, ctx, actorId, membershipId);
      if (target.status === status) return this.toDto(target, actorId);
      if (target.role === MembershipRole.OWNER && status === MembershipStatus.SUSPENDED) {
        await this.assertAnotherActiveOwner(tx, ctx.tenantId, target.id);
      }

      const updated = await tx.membership.update({ where: { id: target.id }, data: { status }, select: memberSelect });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.MEMBER_STATUS_CHANGED,
          entityType: 'membership',
          entityId: target.id,
          metadata: { userId: target.userId, from: target.status, to: status },
        },
        tx,
      );
      return this.toDto(updated, actorId);
    });
  }

  private async findManageableTarget(
    tx: Prisma.TransactionClient,
    ctx: TenantContext,
    actorId: string,
    membershipId: string,
  ): Promise<MemberRow> {
    // Lock the row so concurrent changes to the same member serialise.
    await tx.$queryRaw`SELECT id FROM memberships WHERE id = ${membershipId}::uuid AND tenant_id = ${ctx.tenantId}::uuid FOR UPDATE`;
    const target = await tx.membership.findFirst({
      where: { id: membershipId, tenantId: ctx.tenantId },
      select: memberSelect,
    });
    if (!target) throw Errors.notFound('Member');
    if (target.userId === actorId) {
      throw new AppException(HttpStatus.FORBIDDEN, 'CANNOT_MODIFY_SELF', 'You cannot change your own role or status');
    }
    if (!canManageRole(ctx.role, target.role)) {
      throw new AppException(HttpStatus.FORBIDDEN, 'INSUFFICIENT_ROLE', 'You cannot manage a member with this role');
    }
    return target;
  }

  private async assertAnotherActiveOwner(
    tx: Prisma.TransactionClient,
    tenantId: string,
    excludingMembershipId: string,
  ): Promise<void> {
    // Lock all owner rows so two owners cannot demote each other at the same time.
    await tx.$queryRaw`SELECT id FROM memberships WHERE tenant_id = ${tenantId}::uuid AND role = 'OWNER' FOR UPDATE`;
    const others = await tx.membership.count({
      where: {
        tenantId,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        id: { not: excludingMembershipId },
      },
    });
    if (others === 0) {
      throw new AppException(HttpStatus.CONFLICT, 'LAST_OWNER', 'A business must keep at least one active owner');
    }
  }

  private toDto(row: MemberRow, actorId: string): MemberDto {
    return {
      id: row.id,
      userId: row.userId,
      name: row.user.name,
      email: row.user.email,
      role: row.role,
      status: row.status,
      joinedAt: row.createdAt.toISOString(),
      isCurrentUser: row.userId === actorId,
    };
  }
}
