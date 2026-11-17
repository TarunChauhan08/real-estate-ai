import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type AiUsageSummary, type DashboardOverview, Permission } from '@rea/shared-types';
import { CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { AiUsageQueryDto } from './ai-usage-query.dto';
import { AiUsageService } from './ai-usage.service';
import { DashboardService } from './dashboard.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboard: DashboardService,
    private readonly aiUsage: AiUsageService,
  ) {}

  @Get('overview')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'Overview metrics and setup progress for the active business' })
  overview(@CurrentTenant() ctx: TenantContext): Promise<DashboardOverview> {
    return this.dashboard.overview(ctx);
  }

  @Get('ai-usage')
  @RequirePermissions(Permission.DASHBOARD_READ)
  @ApiOperation({ summary: 'AI replies, tokens, response time and languages over a period' })
  aiUsageSummary(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: AiUsageQueryDto,
  ): Promise<AiUsageSummary> {
    return this.aiUsage.summary(ctx.tenantId, query.days ?? 30);
  }
}
