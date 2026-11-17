import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { MembershipStatus, TenantStatus, UserStatus } from '../../generated/prisma/enums';
import { type TenantContext } from '../auth/auth-context';

/** Tenants a membership may operate in. SUSPENDED tenants are locked out entirely. */
const USABLE_TENANT_STATUSES = [TenantStatus.ACTIVE, TenantStatus.PENDING];

const usableMembership = {
  status: MembershipStatus.ACTIVE,
  tenant: { status: { in: USABLE_TENANT_STATUSES } },
} satisfies Prisma.MembershipWhereInput;

/**
 * Resolves which tenant a user is acting in. This is the single source of truth for
 * tenant context: it always reads the current membership row, so suspensions and
 * role changes take effect on the very next request.
 */
@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Picks the membership a session should start in: the preferred tenant when the user
   * still has a usable membership there, otherwise their oldest usable membership.
   */
  async resolveForSession(
    userId: string,
    preferredTenantId?: string | null,
    tx?: Prisma.TransactionClient,
  ): Promise<TenantContext | null> {
    const client = tx ?? this.prisma;
    const memberships = await client.membership.findMany({
      where: { userId, ...usableMembership },
      orderBy: { createdAt: 'asc' },
      select: { id: true, tenantId: true, role: true },
    });
    const chosen = memberships.find((m) => m.tenantId === preferredTenantId) ?? memberships[0];
    return chosen
      ? { tenantId: chosen.tenantId, membershipId: chosen.id, role: chosen.role }
      : null;
  }

  /**
   * Validates the membership referenced by an access token against the database.
   * Returns null if it no longer exists, belongs to someone else, or is not usable.
   */
  async verifyTokenMembership(
    userId: string,
    tenantId: string,
    membershipId: string,
  ): Promise<TenantContext | null> {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, userId, tenantId, ...usableMembership },
      select: { id: true, tenantId: true, role: true },
    });
    return membership
      ? { tenantId: membership.tenantId, membershipId: membership.id, role: membership.role }
      : null;
  }

  async isUserActive(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { status: true },
    });
    return user?.status === UserStatus.ACTIVE;
  }

  /** All tenants the user can switch into, for the account menu. */
  listUsable(userId: string) {
    return this.prisma.membership.findMany({
      where: { userId, ...usableMembership },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        role: true,
        tenant: { select: { id: true, name: true, slug: true, status: true } },
      },
    });
  }
}
