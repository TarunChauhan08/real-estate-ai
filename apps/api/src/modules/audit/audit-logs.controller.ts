import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AuditLogDto, Permission } from '@rea/shared-types';
import { CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { AuditLogQueryDto } from './dto/audit-log-query.dto';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit-logs')
export class AuditLogsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions(Permission.AUDIT_READ)
  @ApiOperation({ summary: 'Audit trail for the active business (newest first)' })
  async list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: AuditLogQueryDto,
  ): Promise<Paginated<AuditLogDto>> {
    const where: Prisma.AuditLogWhereInput = {
      tenantId: ctx.tenantId,
      action: query.action,
      entityType: query.entityType,
      actorId: query.actorId,
      createdAt: query.from || query.to ? { gte: query.from, lte: query.to } : undefined,
    };
    const [rows, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: query.skip,
        take: query.pageSize,
        include: { actor: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);
    const items: AuditLogDto[] = rows.map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata: (row.metadata as Record<string, unknown> | null) ?? null,
      actor: row.actor,
      createdAt: row.createdAt.toISOString(),
    }));
    return Paginated.of(items, total, query.page, query.pageSize);
  }
}
