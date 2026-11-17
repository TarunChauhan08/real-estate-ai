import { Injectable } from '@nestjs/common';
import { type PropertyDto } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { formatDateOnly, parseDateOnly } from '../../common/utils/date';
import { PrismaService } from '../../database/prisma.service';
import { type Prisma } from '../../generated/prisma/client';
import { PropertyStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { type CreatePropertyDto } from './dto/create-property.dto';
import { type PropertyQueryDto } from './dto/property-query.dto';
import { type UpdatePropertyDto } from './dto/update-property.dto';

type PropertyRow = Prisma.PropertyGetPayload<object>;

/**
 * Property inventory for the active tenant.
 *
 * Rules enforced here:
 * - Every query carries `tenantId` from the authenticated membership; a property ID from
 *   another business is indistinguishable from one that does not exist (404).
 * - Properties are never hard-deleted. Setting status ARCHIVED removes them from default lists.
 * - Required columns can't be nulled out by a PATCH.
 */
@Injectable()
export class PropertiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(ctx: TenantContext, query: PropertyQueryDto): Promise<Paginated<PropertyDto>> {
    const where = this.buildWhere(ctx.tenantId, query);
    const [rows, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        orderBy: this.buildOrderBy(query.sort),
        skip: query.skip,
        take: query.pageSize,
      }),
      this.prisma.property.count({ where }),
    ]);
    return Paginated.of(rows.map(toDto), total, query.page, query.pageSize);
  }

  async get(ctx: TenantContext, id: string): Promise<PropertyDto> {
    const row = await this.prisma.property.findFirst({ where: { id, tenantId: ctx.tenantId } });
    if (!row) throw Errors.notFound('Property');
    return toDto(row);
  }

  async create(ctx: TenantContext, actorId: string, dto: CreatePropertyDto): Promise<PropertyDto> {
    const possessionDate = this.parseDate(dto.possessionDate);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.property.create({
        data: {
          tenantId: ctx.tenantId,
          createdById: actorId,
          title: dto.title,
          projectName: dto.projectName,
          propertyType: dto.propertyType,
          listingType: dto.listingType,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          carpetAreaSqft: dto.carpetAreaSqft,
          price: BigInt(dto.price),
          locality: dto.locality,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,
          possessionStatus: dto.possessionStatus,
          possessionDate,
          reraNumber: dto.reraNumber,
          amenities: dto.amenities ?? [],
          description: dto.description,
        },
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.PROPERTY_CREATED,
          entityType: 'property',
          entityId: row.id,
          metadata: { propertyType: row.propertyType, listingType: row.listingType },
        },
        tx,
      );
      return toDto(row);
    });
  }

  async update(
    ctx: TenantContext,
    actorId: string,
    id: string,
    dto: UpdatePropertyDto,
  ): Promise<PropertyDto> {
    const possessionDate = this.parseDate(dto.possessionDate);
    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.property.findFirst({ where: { id, tenantId: ctx.tenantId } });
      if (!existing) throw Errors.notFound('Property');

      const data: Prisma.PropertyUncheckedUpdateInput = {
        // Required columns: `null` means "not provided", never "clear".
        title: dto.title ?? undefined,
        propertyType: dto.propertyType ?? undefined,
        listingType: dto.listingType ?? undefined,
        price: dto.price === null || dto.price === undefined ? undefined : BigInt(dto.price),
        city: dto.city ?? undefined,
        status: dto.status ?? undefined,
        amenities: dto.amenities ?? undefined,
        // Optional columns: `null` clears, `undefined` leaves alone.
        projectName: dto.projectName,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        carpetAreaSqft: dto.carpetAreaSqft,
        locality: dto.locality,
        state: dto.state,
        pincode: dto.pincode,
        possessionStatus: dto.possessionStatus,
        possessionDate,
        reraNumber: dto.reraNumber,
        description: dto.description,
      };
      const changedFields = Object.entries(data)
        .filter(([, value]) => value !== undefined)
        .map(([key]) => key);
      if (changedFields.length === 0) return toDto(existing);

      const row = await tx.property.update({ where: { id: existing.id }, data });

      if (dto.status && dto.status !== existing.status) {
        await this.audit.record(
          {
            tenantId: ctx.tenantId,
            actorId,
            action: AuditAction.PROPERTY_STATUS_CHANGED,
            entityType: 'property',
            entityId: row.id,
            metadata: { from: existing.status, to: row.status },
          },
          tx,
        );
      }
      const otherFields = changedFields.filter((field) => field !== 'status');
      if (otherFields.length > 0) {
        await this.audit.record(
          {
            tenantId: ctx.tenantId,
            actorId,
            action: AuditAction.PROPERTY_UPDATED,
            entityType: 'property',
            entityId: row.id,
            metadata: { fields: otherFields },
          },
          tx,
        );
      }
      return toDto(row);
    });
  }

  /** `undefined` = not provided, `null` = clear, string = validated calendar date. */
  private parseDate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined || value === null) return value;
    const parsed = parseDateOnly(value);
    if (!parsed) {
      throw Errors.validation([{ field: 'possessionDate', message: 'Enter a real calendar date' }]);
    }
    return parsed;
  }

  private buildWhere(tenantId: string, query: PropertyQueryDto): Prisma.PropertyWhereInput {
    const and: Prisma.PropertyWhereInput[] = [];
    if (query.q) {
      and.push({
        OR: [
          { title: { contains: query.q, mode: 'insensitive' } },
          { projectName: { contains: query.q, mode: 'insensitive' } },
          { locality: { contains: query.q, mode: 'insensitive' } },
          { city: { contains: query.q, mode: 'insensitive' } },
        ],
      });
    }
    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      and.push({
        price: {
          gte: query.minPrice === undefined ? undefined : BigInt(query.minPrice),
          lte: query.maxPrice === undefined ? undefined : BigInt(query.maxPrice),
        },
      });
    }
    return {
      tenantId,
      // Archived listings only appear when explicitly requested.
      status: query.status ?? { not: PropertyStatus.ARCHIVED },
      propertyType: query.propertyType,
      listingType: query.listingType,
      bedrooms: query.bedrooms,
      city: query.city ? { equals: query.city, mode: 'insensitive' } : undefined,
      AND: and.length > 0 ? and : undefined,
    };
  }

  private buildOrderBy(sort: PropertyQueryDto['sort']): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sort) {
      case 'price_asc':
        return [{ price: 'asc' }, { id: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }, { id: 'asc' }];
      default:
        return [{ createdAt: 'desc' }, { id: 'asc' }];
    }
  }
}

export function toDto(row: PropertyRow): PropertyDto {
  return {
    id: row.id,
    title: row.title,
    projectName: row.projectName,
    propertyType: row.propertyType,
    listingType: row.listingType,
    status: row.status,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    carpetAreaSqft: row.carpetAreaSqft,
    price: Number(row.price),
    locality: row.locality,
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    possessionStatus: row.possessionStatus,
    possessionDate: row.possessionDate ? formatDateOnly(row.possessionDate) : null,
    reraNumber: row.reraNumber,
    amenities: row.amenities,
    description: row.description,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
