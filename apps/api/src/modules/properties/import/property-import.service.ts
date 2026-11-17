import { Injectable } from '@nestjs/common';
import {
  type AddSampleListingsResult,
  type ImportListingsResult,
  type ImportRowError,
  LISTING_IMPORT_MAX_ROWS,
} from '@rea/shared-types';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Errors } from '../../../common/errors/app.exception';
import { flatten } from '../../../common/pipes/validation.pipe';
import { parseDateOnly } from '../../../common/utils/date';
import { PrismaService } from '../../../database/prisma.service';
import { type Prisma } from '../../../generated/prisma/client';
import { ListingType, PossessionStatus, PropertyType } from '../../../generated/prisma/enums';
import { AuditService } from '../../audit/audit.service';
import { AuditAction } from '../../audit/audit-actions';
import { type TenantContext } from '../../auth/auth-context';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { parseListingsCsv } from './csv';

const REQUIRED = ['title', 'propertyType', 'price', 'city'] as const;
const REQUIRED_LABELS: Record<(typeof REQUIRED)[number], string> = {
  title: 'Title',
  propertyType: 'Property type',
  price: 'Price',
  city: 'City',
};
const MAX_CSV_BYTES = 2 * 1024 * 1024;
export const SAMPLE_PREFIX = 'Sample · ';

/**
 * Bulk import of listings from a spreadsheet, and demo listings for a quick start.
 *
 * Import is all-or-nothing: every row is validated with exactly the same rules as the "Add
 * listing" form, and nothing is created unless every row is valid. A dry run shows the problems
 * first, by spreadsheet row number, so they can be fixed in Excel or Google Sheets.
 */
@Injectable()
export class PropertyImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async import(
    ctx: TenantContext,
    actorId: string,
    csv: string,
    dryRun: boolean,
  ): Promise<ImportListingsResult> {
    if (Buffer.byteLength(csv, 'utf8') > MAX_CSV_BYTES)
      throw Errors.badRequest(
        'IMPORT_TOO_LARGE',
        'The file is larger than 2 MB. Split it into smaller files.',
      );

    const sheet = parseListingsCsv(csv);
    const missing = REQUIRED.filter((field) => !sheet.fields.includes(field));
    if (missing.length > 0) {
      throw Errors.badRequest(
        'IMPORT_MISSING_COLUMNS',
        `The file needs these columns: ${missing.map((f) => REQUIRED_LABELS[f]).join(', ')}. Download the template to see the format.`,
      );
    }
    if (sheet.rows.length === 0)
      throw Errors.badRequest('IMPORT_EMPTY', 'The file has column headers but no listings.');
    if (sheet.rows.length > LISTING_IMPORT_MAX_ROWS)
      throw Errors.badRequest(
        'IMPORT_TOO_MANY_ROWS',
        `Import up to ${LISTING_IMPORT_MAX_ROWS} listings at a time.`,
      );

    const errors: ImportRowError[] = [];
    const ready: Prisma.PropertyCreateManyInput[] = [];
    for (const { rowNumber, input } of sheet.rows) {
      const dto = plainToInstance(CreatePropertyDto, input);
      const problems = flatten(
        await validate(dto, { whitelist: true, forbidUnknownValues: false }),
      );
      let possessionDate: Date | null = null;
      if (dto.possessionDate) {
        possessionDate = parseDateOnly(dto.possessionDate);
        if (!possessionDate)
          problems.push({ field: 'possessionDate', message: 'Use a date like 2027-06-30' });
      }
      if (problems.length > 0) {
        // One message per field is enough to fix a row.
        const seen = new Set<string>();
        for (const p of problems) {
          if (seen.has(p.field)) continue;
          seen.add(p.field);
          errors.push({ row: rowNumber, field: p.field, message: p.message });
        }
        continue;
      }
      ready.push({
        tenantId: ctx.tenantId,
        createdById: actorId,
        title: dto.title,
        projectName: dto.projectName ?? null,
        propertyType: dto.propertyType,
        listingType: dto.listingType ?? ListingType.SALE,
        bedrooms: dto.bedrooms ?? null,
        bathrooms: dto.bathrooms ?? null,
        carpetAreaSqft: dto.carpetAreaSqft ?? null,
        price: BigInt(dto.price),
        locality: dto.locality ?? null,
        city: dto.city,
        state: dto.state ?? null,
        pincode: dto.pincode ?? null,
        possessionStatus: dto.possessionStatus ?? null,
        possessionDate,
        reraNumber: dto.reraNumber ?? null,
        amenities: dto.amenities ?? [],
        description: dto.description ?? null,
      });
    }

    const result: ImportListingsResult = {
      total: sheet.rows.length,
      valid: ready.length,
      created: 0,
      errors,
      ignoredColumns: sheet.ignoredHeaders,
    };
    if (dryRun || errors.length > 0) return result;

    await this.prisma.$transaction(async (tx) => {
      const { count } = await tx.property.createMany({ data: ready });
      result.created = count;
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.PROPERTIES_IMPORTED,
          entityType: 'property',
          metadata: { count },
        },
        tx,
      );
    });
    return result;
  }

  /** Six realistic demo listings so the AI can be tried before real inventory is added. */
  async addSamples(ctx: TenantContext, actorId: string): Promise<AddSampleListingsResult> {
    const existing = await this.prisma.property.count({
      where: { tenantId: ctx.tenantId, title: { startsWith: SAMPLE_PREFIX } },
    });
    if (existing > 0)
      throw Errors.conflict('SAMPLES_EXIST', 'Sample listings have already been added.');

    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId: ctx.tenantId },
      select: { city: true, state: true },
    });
    const city = profile?.city?.trim() || 'Noida';
    const state = profile?.city?.trim() ? (profile.state ?? null) : 'Uttar Pradesh';
    const note =
      'This is a sample listing so you can try the AI before adding your own inventory. Edit it or archive it any time.';
    const samples: Array<
      Omit<Prisma.PropertyCreateManyInput, 'tenantId' | 'createdById' | 'city'>
    > = [
      {
        title: `${SAMPLE_PREFIX}2 BHK apartment, ready to move`,
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        bedrooms: 2,
        bathrooms: 2,
        carpetAreaSqft: 980,
        price: BigInt(6_200_000),
        locality: 'Central',
        possessionStatus: PossessionStatus.READY_TO_MOVE,
        amenities: ['Lift', 'Power backup', 'Covered parking'],
      },
      {
        title: `${SAMPLE_PREFIX}3 BHK apartment with park view`,
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        bedrooms: 3,
        bathrooms: 3,
        carpetAreaSqft: 1450,
        price: BigInt(9_500_000),
        locality: 'Lakeside',
        possessionStatus: PossessionStatus.READY_TO_MOVE,
        amenities: ['Clubhouse', 'Swimming pool', 'Gym', 'Kids play area'],
      },
      {
        title: `${SAMPLE_PREFIX}3 BHK in a new launch`,
        projectName: 'Sample Residences',
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.SALE,
        bedrooms: 3,
        bathrooms: 3,
        carpetAreaSqft: 1520,
        price: BigInt(11_800_000),
        locality: 'Expressway',
        possessionStatus: PossessionStatus.UNDER_CONSTRUCTION,
        possessionDate: new Date(Date.UTC(new Date().getUTCFullYear() + 2, 5, 30)),
        amenities: ['Clubhouse', 'Jogging track', '24×7 security'],
      },
      {
        title: `${SAMPLE_PREFIX}4 BHK villa with garden`,
        propertyType: PropertyType.VILLA,
        listingType: ListingType.SALE,
        bedrooms: 4,
        bathrooms: 4,
        carpetAreaSqft: 2900,
        price: BigInt(32_500_000),
        locality: 'Greenwood',
        possessionStatus: PossessionStatus.READY_TO_MOVE,
        amenities: ['Private garden', 'Two car parks', 'Gated community'],
      },
      {
        title: `${SAMPLE_PREFIX}2 BHK for rent, semi-furnished`,
        propertyType: PropertyType.APARTMENT,
        listingType: ListingType.RENT,
        bedrooms: 2,
        bathrooms: 2,
        carpetAreaSqft: 1050,
        price: BigInt(28_000),
        locality: 'Central',
        possessionStatus: PossessionStatus.READY_TO_MOVE,
        amenities: ['Semi-furnished', 'Lift', 'Power backup'],
      },
      {
        title: `${SAMPLE_PREFIX}200 sq yd residential plot`,
        propertyType: PropertyType.PLOT,
        listingType: ListingType.SALE,
        carpetAreaSqft: 1800,
        price: BigInt(14_000_000),
        locality: 'Outer Ring Road',
        amenities: ['Corner plot', 'Gated layout'],
      },
    ];

    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.property.createMany({
        data: samples.map((s) => ({
          ...s,
          tenantId: ctx.tenantId,
          createdById: actorId,
          city,
          state,
          description: note,
        })),
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.SAMPLE_PROPERTIES_ADDED,
          entityType: 'property',
          metadata: { count },
        },
        tx,
      );
      return { created: count };
    });
  }
}
