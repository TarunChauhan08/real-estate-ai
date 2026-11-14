import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type DashboardOverview, Permission } from '@rea/shared-types';
import { CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('overview')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Overview metrics and setup progress for the active business' })
  overview(@CurrentTenant() ctx: TenantContext): Promise<DashboardOverview> {
    return this.dashboard.overview(ctx);
  }
}
