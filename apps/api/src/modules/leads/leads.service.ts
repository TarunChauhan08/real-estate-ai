import { Injectable } from '@nestjs/common';
import { canTransitionLeadStatus, type LeadDto } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { MembershipStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { type AssignLeadDto } from './dto/assign-lead.dto';
import { type CreateLeadDto } from './dto/create-lead.dto';
import { type LeadQueryDto } from './dto/lead-query.dto';
import { type LeadStatusDto } from './dto/lead-status.dto';
import { type UpdateLeadDto } from './dto/update-lead.dto';

const leadInclude = {
  assignedTo: { select: { id: true, user: { select: { name: true } } } },
} satisfies Prisma.LeadInclude;
type LeadRow = Prisma.LeadGetPayload<{ include: typeof leadInclude }>;

/**
 * Leads for the active tenant. Phone numbers are normalised to E.164 and unique per tenant,
 * so the same buyer arriving via WhatsApp and a portal is one lead, not two.
 */
@Injectable()
export class LeadsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: TenantContext, query: LeadQueryDto): Promise<Paginated<LeadDto>> {
    const where = this.buildWhere(ctx.tenantId, query);
    const [rows, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: leadInclude,
        orderBy: this.buildOrderBy(query.sort),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.lead.count({ where }),
    ]);
    return Paginated.of(rows.map(toLeadDto), total, query.page, query.pageSize);
  }

  async get(ctx: TenantContext, id: string): Promise<LeadDto> {
    const row = await this.prisma.lead.findFirst({
      where: { id, tenantId: ctx.tenantId },
      include: leadInclude,
    });
    if (!row) throw Errors.notFound('Lead');
    return toLeadDto(row);
  }

  async create(ctx: TenantContext, actorId: string, dto: CreateLeadDto): Promise<LeadDto> {
    this.assertBudgetOrder(dto.budgetMin ?? null, dto.budgetMax ?? null);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.lead.create({
          data: {
            tenantId: ctx.tenantId,
            createdById: actorId,
            name: dto.name,
            phone: dto.phone,
            email: dto.email,
            source: dto.source,
            temperature: dto.temperature,
            budgetMin: toBigInt(dto.budgetMin),
            budgetMax: toBigInt(dto.budgetMax),
            preferredCity: dto.preferredCity,
            preferredLocalities: dto.preferredLocalities ?? [],
            preferredBedrooms: dto.preferredBedrooms ?? [],
            purpose: dto.purpose,
            timeline: dto.timeline,
            needsHomeLoan: dto.needsHomeLoan,
            preferredLanguage: dto.preferredLanguage,
            notes: dto.notes,
          },
          include: leadInclude,
        });
        await this.audit.record(
          {
            tenantId: ctx.tenantId,
            actorId,
            action: AuditAction.LEAD_CREATED,
            entityType: 'lead',
            entityId: row.id,
            metadata: { source: row.source },
          },
          tx,
        );
        return toLeadDto(row);
      });
    } catch (error) {
      throw this.mapUniquePhone(error);
    }
  }

  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdateLeadDto,
  ): Promise<LeadDto> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const existing = await tx.lead.findFirst({ where: { id, tenantId: ctx.tenantId } });
        if (!existing) throw Errors.notFound('Lead');

        const nextMin = dto.budgetMin === undefined ? toNumber(existing.budgetMin) : dto.budgetMin;
        const nextMax = dto.budgetMax === undefined ? toNumber(existing.budgetMax) : dto.budgetMax;
        this.assertBudgetOrder(nextMin, nextMax);

        const data: Prisma.LeadUncheckedUpdateInput = {
          // Required columns: `null` means "not provided", never "clear".
          name: dto.name ?? undefined,
          phone: dto.phone ?? undefined,
          source: dto.source ?? undefined,
          temperature: dto.temperature ?? undefined,
          preferredLocalities: dto.preferredLocalities ?? undefined,
          preferredBedrooms: dto.preferredBedrooms ?? undefined,
          // Optional columns: `null` clears, `undefined` leaves alone.
          email: dto.email,
          budgetMin: toBigInt(dto.budgetMin),
          budgetMax: toBigInt(dto.budgetMax),
          preferredCity: dto.preferredCity,
          purpose: dto.purpose,
          timeline: dto.timeline,
          needsHomeLoan: dto.needsHomeLoan,
          preferredLanguage: dto.preferredLanguage,
          notes: dto.notes,
        };
        const changedFields = Object.entries(data)
          .filter(([, value]) => value !== undefined)
          .map(([key]) => key);
        if (changedFields.length === 0) return this.reload(tx, ctx.tenantId, existing.id);

        await tx.lead.update({ where: { id: existing.id }, data });
        await this.audit.record(
          {
            tenantId: ctx.tenantId,
            actorId,
            action: AuditAction.LEAD_UPDATED,
            entityType: 'lead',
            entityId: existing.id,
            metadata: { fields: changedFields },
          },
          tx,
        );
        return this.reload(tx, ctx.tenantId, existing.id);
      });
    } catch (error) {
      throw this.mapUniquePhone(error);
    }
  }

  async changeStatus(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: LeadStatusDto,
  ): Promise<LeadDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw Errors.notFound('Lead');
      if (existing.status === dto.status) return this.reload(tx, ctx.tenantId, existing.id);
      if (!canTransitionLeadStatus(existing.status, dto.status)) {
        throw Errors.conflict(
          'LEAD_INVALID_TRANSITION',
          `A ${existing.status} lead cannot be moved to ${dto.status}`,
        );
      }
      await tx.lead.update({ where: { id: existing.id }, data: { status: dto.status } });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.LEAD_STATUS_CHANGED,
          entityType: 'lead',
          entityId: existing.id,
          metadata: { from: existing.status, to: dto.status },
        },
        tx,
      );
      return this.reload(tx, ctx.tenantId, existing.id);
    });
  }

  async assign(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: AssignLeadDto,
  ): Promise<LeadDto> {
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.lead.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw Errors.notFound('Lead');

      if (dto.membershipId !== null) {
        // The assignee must be an active member of THIS business.
        const member = await tx.membership.findFirst({
          where: { id: dto.membershipId, tenantId: ctx.tenantId, status: MembershipStatus.ACTIVE },
          select: { id: true },
        });
        if (!member) {
          throw Errors.validation([
            { field: 'membershipId', message: 'Choose an active member of your team' },
          ]);
        }
      }
      if (existing.assignedToId === dto.membershipId)
        return this.reload(tx, ctx.tenantId, existing.id);

      await tx.lead.update({
        where: { id: existing.id },
        data: { assignedToId: dto.membershipId },
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.LEAD_ASSIGNED,
          entityType: 'lead',
          entityId: existing.id,
          metadata: { from: existing.assignedToId, to: dto.membershipId },
        },
        tx,
      );
      return this.reload(tx, ctx.tenantId, existing.id);
    });
  }

  private async reload(
    tx: Prisma.TransactionClient,
    tenantId: string,
    id: string,
  ): Promise<LeadDto> {
    const row = await tx.lead.findFirst({ where: { id, tenantId }, include: leadInclude });
    if (!row) throw Errors.notFound('Lead');
    return toLeadDto(row);
  }

  private assertBudgetOrder(min: number | null, max: number | null): void {
    if (min !== null && max !== null && min > max) {
      throw Errors.validation([
        { field: 'budgetMax', message: 'Maximum budget must be at least the minimum budget' },
      ]);
    }
  }

  private mapUniquePhone(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return Errors.conflict('LEAD_PHONE_EXISTS', 'A lead with this phone number already exists');
    }
    return error;
  }

  private buildWhere(tenantId: string, query: LeadQueryDto): Prisma.LeadWhereInput {
    const search = query.q?.trim();
    return {
      tenantId,
      status: query.status,
      temperature: query.temperature,
      source: query.source,
      assignedToId: query.assignedToId,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            // Digits-only search matches formatted numbers like "98765 43210".
            { phone: { contains: search.replace(/[^\d+]/g, '') || search } },
          ]
        : undefined,
    };
  }

  private buildOrderBy(sort: LeadQueryDto['sort']): Prisma.LeadOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }, { id: 'asc' }];
      case 'name':
        return [{ name: 'asc' }, { id: 'asc' }];
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }
}

function toBigInt(value: number | null | undefined): bigint | null | undefined {
  return value === null || value === undefined ? value : BigInt(value);
}

function toNumber(value: bigint | null): number | null {
  return value === null ? null : Number(value);
}

export function toLeadDto(row: LeadRow): LeadDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    source: row.source,
    status: row.status,
    temperature: row.temperature,
    budgetMin: toNumber(row.budgetMin),
    budgetMax: toNumber(row.budgetMax),
    preferredCity: row.preferredCity,
    preferredLocalities: row.preferredLocalities,
    preferredBedrooms: row.preferredBedrooms,
    purpose: row.purpose,
    timeline: row.timeline,
    needsHomeLoan: row.needsHomeLoan,
    preferredLanguage: row.preferredLanguage,
    notes: row.notes,
    assignedTo: row.assignedTo ? { id: row.assignedTo.id, name: row.assignedTo.user.name } : null,
    lastContactedAt: row.lastContactedAt ? row.lastContactedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
