import { Injectable } from '@nestjs/common';
import { type BusinessProfileDto, type TenantDto, type TenantSettingsDto } from '@rea/shared-types';
import { Errors } from '../../common/errors/app.exception';
import { PrismaService } from '../../database/prisma.service';
import { TenantStatus } from '../../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/audit-actions';
import { type TenantContext } from '../auth/auth-context';
import { type CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { type UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { type UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { type UpdateTenantDto } from './dto/update-tenant.dto';

const tenantSelect = {
  id: true,
  name: true,
  slug: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;
const profileSelect = {
  businessType: true,
  phone: true,
  website: true,
  city: true,
  state: true,
  country: true,
  updatedAt: true,
} as const;
const settingsSelect = {
  timezone: true,
  locale: true,
  currency: true,
  preferredLanguage: true,
  updatedAt: true,
} as const;

/** Names of the fields that actually changed — recorded in audit metadata (values are not). */
function changedFields<T extends object>(before: T, patch: Partial<T>): string[] {
  return (Object.keys(patch) as Array<keyof T>).filter(
    (key) => patch[key] !== undefined && patch[key] !== before[key],
  ) as string[];
}

/**
 * Current-tenant operations. Every query is keyed by `ctx.tenantId`, which comes from the
 * authenticated membership — there is no code path that accepts a tenant ID from the client.
 */
@Injectable()
export class TenantsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async getTenant(ctx: TenantContext): Promise<TenantDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: ctx.tenantId },
      select: tenantSelect,
    });
    if (!tenant) throw Errors.notFound('Business');
    return this.toTenantDto(tenant);
  }

  async updateTenant(
    ctx: TenantContext,
    actorId: string,
    dto: UpdateTenantDto,
  ): Promise<TenantDto> {
    const before = await this.getTenant(ctx);
    const fields = changedFields(before, dto);
    if (fields.length === 0) return before;

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { name: dto.name },
        select: tenantSelect,
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.TENANT_UPDATED,
          entityType: 'tenant',
          entityId: ctx.tenantId,
          metadata: { fields },
        },
        tx,
      );
      return this.toTenantDto(tenant);
    });
  }

  async getProfile(ctx: TenantContext): Promise<BusinessProfileDto> {
    const profile = await this.prisma.businessProfile.findUnique({
      where: { tenantId: ctx.tenantId },
      select: profileSelect,
    });
    if (!profile) throw Errors.notFound('Business profile');
    return { ...profile, updatedAt: profile.updatedAt.toISOString() };
  }

  async updateProfile(
    ctx: TenantContext,
    actorId: string,
    dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfileDto> {
    const before = await this.getProfile(ctx);
    const fields = changedFields(before, dto);
    if (fields.length === 0) return before;

    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.businessProfile.update({
        where: { tenantId: ctx.tenantId },
        data: dto,
        select: profileSelect,
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.BUSINESS_PROFILE_UPDATED,
          entityType: 'business_profile',
          entityId: ctx.tenantId,
          metadata: { fields },
        },
        tx,
      );
      return { ...profile, updatedAt: profile.updatedAt.toISOString() };
    });
  }

  async getSettings(ctx: TenantContext): Promise<TenantSettingsDto> {
    const settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId: ctx.tenantId },
      select: settingsSelect,
    });
    if (!settings) throw Errors.notFound('Business settings');
    return this.toSettingsDto(settings);
  }

  async updateSettings(
    ctx: TenantContext,
    actorId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsDto> {
    const before = await this.getSettings(ctx);
    const fields = changedFields(before, dto);
    if (fields.length === 0) return before;

    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.tenantSettings.update({
        where: { tenantId: ctx.tenantId },
        data: dto,
        select: settingsSelect,
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.TENANT_SETTINGS_UPDATED,
          entityType: 'tenant_settings',
          entityId: ctx.tenantId,
          metadata: { fields, ...dto },
        },
        tx,
      );
      return this.toSettingsDto(settings);
    });
  }

  /**
   * Saves the onboarding form (tenant name, profile and preferences) in one transaction
   * and moves the tenant from PENDING to ACTIVE. Re-submitting updates the same records.
   */
  async completeOnboarding(
    ctx: TenantContext,
    actorId: string,
    dto: CompleteOnboardingDto,
  ): Promise<TenantDto> {
    const current = await this.getTenant(ctx);
    if (current.status === TenantStatus.SUSPENDED)
      throw Errors.forbidden('This business is suspended');

    return this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.update({
        where: { id: ctx.tenantId },
        data: { name: dto.businessName, status: TenantStatus.ACTIVE },
        select: tenantSelect,
      });
      await tx.businessProfile.update({
        where: { tenantId: ctx.tenantId },
        data: {
          businessType: dto.businessType,
          phone: dto.phone ?? null,
          website: dto.website ?? null,
          city: dto.city,
          state: dto.state,
        },
      });
      await tx.tenantSettings.update({
        where: { tenantId: ctx.tenantId },
        data: { timezone: dto.timezone, preferredLanguage: dto.preferredLanguage },
      });
      await this.audit.record(
        {
          tenantId: ctx.tenantId,
          actorId,
          action: AuditAction.TENANT_ONBOARDING_COMPLETED,
          entityType: 'tenant',
          entityId: ctx.tenantId,
          metadata: { previousStatus: current.status },
        },
        tx,
      );
      return this.toTenantDto(tenant);
    });
  }

  private toTenantDto(
    tenant: { createdAt: Date; updatedAt: Date } & Omit<TenantDto, 'createdAt' | 'updatedAt'>,
  ): TenantDto {
    return {
      ...tenant,
      createdAt: tenant.createdAt.toISOString(),
      updatedAt: tenant.updatedAt.toISOString(),
    };
  }

  private toSettingsDto(
    settings: { updatedAt: Date; preferredLanguage: string } & Omit<
      TenantSettingsDto,
      'updatedAt' | 'preferredLanguage'
    >,
  ): TenantSettingsDto {
    return {
      ...settings,
      preferredLanguage: settings.preferredLanguage as TenantSettingsDto['preferredLanguage'],
      updatedAt: settings.updatedAt.toISOString(),
    };
  }
}
