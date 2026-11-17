import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type BusinessDataExport, Permission, type TenantDto } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { StrictRateLimit } from '../../common/rate-limit/rate-limit';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { RequestDeletionDto } from './business-data.dto';
import { BusinessDataService } from './business-data.service';

/** Owner-only: take all business data out, or delete it. */
@ApiTags('business data')
@ApiBearerAuth()
@Controller('tenants/current')
export class BusinessDataController {
  constructor(private readonly data: BusinessDataService) {}

  @Get('data-export')
  @StrictRateLimit()
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Download everything this business has stored, as JSON (owners)' })
  export(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
  ): Promise<BusinessDataExport> {
    return this.data.export(ctx, auth.userId);
  }

  @Post('deletion')
  @HttpCode(HttpStatus.OK)
  @StrictRateLimit()
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Schedule permanent deletion of this business (owners)' })
  requestDeletion(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: RequestDeletionDto,
  ): Promise<Pick<TenantDto, 'deletionScheduledFor'>> {
    return this.data.requestDeletion(ctx, auth.userId, dto.password, dto.confirmBusinessName);
  }

  @Delete('deletion')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions(Permission.TENANT_UPDATE)
  @ApiOperation({ summary: 'Cancel a scheduled deletion (owners)' })
  cancelDeletion(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
  ): Promise<void> {
    return this.data.cancelDeletion(ctx, auth.userId);
  }
}
