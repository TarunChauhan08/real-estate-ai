import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type BusinessProfileDto,
  Permission,
  type TenantDto,
  type TenantSettingsDto,
} from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { CompleteOnboardingDto } from './dto/complete-onboarding.dto';
import { UpdateBusinessProfileDto } from './dto/update-business-profile.dto';
import { UpdateTenantSettingsDto } from './dto/update-tenant-settings.dto';
import { UpdateTenantDto } from './dto/update-tenant.dto';
import { TenantsService } from './tenants.service';

/**
 * The active tenant is always `current` — resolved from the caller's membership.
 * There are deliberately no `/tenants/:id` routes.
 */
@ApiTags('tenants')
@ApiBearerAuth()
@Controller('tenants/current')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @RequirePermissions(Permission.TENANT_READ)
  @ApiOperation({ summary: 'Get the active business' })
  getTenant(@CurrentTenant() ctx: TenantContext): Promise<TenantDto> {
    return this.tenants.getTenant(ctx);
  }

  @Patch()
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update the active business (name)' })
  updateTenant(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantDto> {
    return this.tenants.updateTenant(ctx, auth.userId, dto);
  }

  @Get('profile')
  @RequirePermissions(Permission.TENANT_READ)
  @ApiOperation({ summary: 'Get the business profile' })
  getProfile(@CurrentTenant() ctx: TenantContext): Promise<BusinessProfileDto> {
    return this.tenants.getProfile(ctx);
  }

  @Patch('profile')
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Update the business profile' })
  updateProfile(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: UpdateBusinessProfileDto,
  ): Promise<BusinessProfileDto> {
    return this.tenants.updateProfile(ctx, auth.userId, dto);
  }

  @Get('settings')
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiOperation({ summary: 'Get business preferences (timezone, locale, currency, language)' })
  getSettings(@CurrentTenant() ctx: TenantContext): Promise<TenantSettingsDto> {
    return this.tenants.getSettings(ctx);
  }

  @Patch('settings')
  @RequirePermissions(Permission.SETTINGS_UPDATE)
  @ApiOperation({ summary: 'Update business preferences' })
  updateSettings(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsDto> {
    return this.tenants.updateSettings(ctx, auth.userId, dto);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Complete business onboarding; activates a PENDING business' })
  completeOnboarding(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CompleteOnboardingDto,
  ): Promise<TenantDto> {
    return this.tenants.completeOnboarding(ctx, auth.userId, dto);
  }
}
