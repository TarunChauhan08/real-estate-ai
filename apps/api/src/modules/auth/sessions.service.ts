import { randomUUID } from 'node:crypto';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AppException, Errors } from '../../common/errors/app.exception';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { TokenService } from './token.service';

/**
 * A rotated token presented again within this window is treated as a benign race
 * (e.g. two browser tabs refreshing at once) rather than theft.
 */
const ROTATION_GRACE_MS = 10_000;

export interface IssuedSession {
  sessionId: string;
  familyId: string;
  refreshToken: string;
}

export interface RotationResult extends IssuedSession {
  userId: string;
  tenantId: string | null;
}

/** Persistence and rotation of refresh-token sessions. */
@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
  ) {}

  async create(
    params: { userId: string; tenantId: string | null; familyId?: string; userAgent?: string },
    tx?: Prisma.TransactionClient,
  ): Promise<IssuedSession> {
    const client = tx ?? this.prisma;
    const { token, tokenHash } = this.tokens.createRefreshToken();
    const familyId = params.familyId ?? randomUUID();
    const session = await client.refreshSession.create({
      data: {
        userId: params.userId,
        tenantId: params.tenantId,
        familyId,
        tokenHash,
        userAgent: params.userAgent?.slice(0, 255),
        expiresAt: new Date(Date.now() + this.tokens.refreshTtlMs),
      },
      select: { id: true },
    });
    return { sessionId: session.id, familyId, refreshToken: token };
  }

  /**
   * Exchanges a refresh token for a new one. The old session is revoked and linked to its successor.
   * Presenting an already-rotated token outside the grace window revokes the entire family.
   */
  async rotate(refreshToken: string, userAgent?: string): Promise<RotationResult> {
    const tokenHash = this.tokens.hashRefreshToken(refreshToken);
    const existing = await this.prisma.refreshSession.findUnique({ where: { tokenHash } });
    if (!existing) throw Errors.unauthenticated('Invalid refresh token');

    if (existing.revokedAt) {
      const rotatedRecently =
        existing.replacedById !== null &&
        Date.now() - existing.revokedAt.getTime() < ROTATION_GRACE_MS;
      if (rotatedRecently) {
        throw new AppException(
          HttpStatus.UNAUTHORIZED,
          'REFRESH_RACE',
          'Session was just refreshed; retry',
        );
      }
      if (existing.replacedById !== null) {
        await this.revokeFamily(existing.familyId);
        await this.audit.recordSafely({
          tenantId: existing.tenantId,
          actorId: existing.userId,
          action: AuditAction.AUTH_REFRESH_REUSE_DETECTED,
          entityType: 'refresh_session',
          entityId: existing.id,
          metadata: { familyId: existing.familyId },
        });
      }
      throw Errors.unauthenticated('Refresh token has been revoked');
    }
    if (existing.expiresAt.getTime() <= Date.now())
      throw Errors.unauthenticated('Refresh token has expired');

    return this.prisma.$transaction(async (tx) => {
      const next = await this.create(
        {
          userId: existing.userId,
          tenantId: existing.tenantId,
          familyId: existing.familyId,
          userAgent,
        },
        tx,
      );
      // Conditional update: only one concurrent request can win the rotation.
      const { count } = await tx.refreshSession.updateMany({
        where: { id: existing.id, revokedAt: null },
        data: { revokedAt: new Date(), replacedById: next.sessionId },
      });
      if (count !== 1) {
        throw new AppException(
          HttpStatus.UNAUTHORIZED,
          'REFRESH_RACE',
          'Session was just refreshed; retry',
        );
      }
      return { ...next, userId: existing.userId, tenantId: existing.tenantId };
    });
  }

  /** Points the family's live session at a different tenant (tenant switch). */
  async setTenant(familyId: string, tenantId: string | null): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { tenantId },
    });
  }

  async revokeFamily(familyId: string): Promise<void> {
    await this.prisma.refreshSession.updateMany({
      where: { familyId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes the family a refresh token belongs to. Unknown tokens are ignored (idempotent logout). */
  async revokeByToken(
    refreshToken: string,
  ): Promise<{ userId: string; tenantId: string | null } | null> {
    const session = await this.prisma.refreshSession.findUnique({
      where: { tokenHash: this.tokens.hashRefreshToken(refreshToken) },
      select: { familyId: true, userId: true, tenantId: true },
    });
    if (!session) return null;
    await this.revokeFamily(session.familyId);
    return { userId: session.userId, tenantId: session.tenantId };
  }

  /** True while at least one unexpired, unrevoked session exists in the family. */
  async isFamilyActive(familyId: string): Promise<boolean> {
    const live = await this.prisma.refreshSession.findFirst({
      where: { familyId, revokedAt: null, expiresAt: { gt: new Date() } },
      select: { id: true },
    });
    return live !== null;
  }

  async revokeAllForUserInTenant(
    userId: string,
    tenantId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    await (tx ?? this.prisma).refreshSession.updateMany({
      where: { userId, tenantId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
