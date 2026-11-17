import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, type SiteVisitDto, type SiteVisitResultDto } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { CreateSiteVisitDto, SiteVisitQueryDto, UpdateSiteVisitDto } from './dto/site-visit.dto';
import { SiteVisitsService } from './site-visits.service';

const uuidPipe = new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Site visit') });

@ApiTags('site-visits')
@ApiBearerAuth()
@Controller('site-visits')
export class SiteVisitsController {
  constructor(private readonly visits: SiteVisitsService) {}

  @Get()
  @RequirePermissions(Permission.SITE_VISITS_READ)
  @ApiOperation({ summary: 'List site visits: requested, upcoming or past' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: SiteVisitQueryDto,
  ): Promise<Paginated<SiteVisitDto>> {
    return this.visits.list(ctx, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.SITE_VISITS_READ)
  get(
    @CurrentTenant() ctx: TenantContext,
    @Param('id', uuidPipe) id: string,
  ): Promise<SiteVisitDto> {
    return this.visits.get(ctx, id);
  }

  @Post()
  @RequirePermissions(Permission.SITE_VISITS_WRITE)
  @ApiOperation({ summary: 'Book a confirmed visit and tell the buyer on WhatsApp' })
  create(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateSiteVisitDto,
  ): Promise<SiteVisitResultDto> {
    return this.visits.create(ctx, auth.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.SITE_VISITS_WRITE)
  @ApiOperation({ summary: 'Confirm, reschedule, reassign, cancel, or record the outcome' })
  update(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateSiteVisitDto,
  ): Promise<SiteVisitResultDto> {
    return this.visits.update(ctx, auth.userId, id, dto);
  }
}
