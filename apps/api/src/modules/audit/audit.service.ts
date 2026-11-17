import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { type AuditAction } from './audit-actions';

export interface AuditEntry {
  tenantId: string | null;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  /** Non-sensitive context only. Keys matching secrets are stripped defensively. */
  metadata?: Record<string, unknown>;
}

const SENSITIVE_KEY = /pass(word)?|token|secret|hash|cookie|authorization/i;

function scrub(metadata: Record<string, unknown> | undefined): Prisma.InputJsonObject | undefined {
  if (!metadata) return undefined;
  const clean: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (!SENSITIVE_KEY.test(key) && value !== undefined) clean[key] = value;
  }
  return clean as Prisma.InputJsonObject;
}

/** Append-only audit trail. Pass a transaction client to record atomically with the change. */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(entry: AuditEntry, tx?: Prisma.TransactionClient): Promise<void> {
    const client = tx ?? this.prisma;
    await client.auditLog.create({
      data: {
        tenantId: entry.tenantId,
        actorId: entry.actorId,
        action: entry.action,
        entityType: entry.entityType,
        entityId: entry.entityId ?? null,
        metadata: scrub(entry.metadata),
      },
    });
  }

  /** Best-effort variant for events outside a business transaction (e.g. failed logins). */
  async recordSafely(entry: AuditEntry): Promise<void> {
    try {
      await this.record(entry);
    } catch (error) {
      this.logger.error(`Failed to write audit entry ${entry.action}: ${(error as Error).message}`);
    }
  }
}
