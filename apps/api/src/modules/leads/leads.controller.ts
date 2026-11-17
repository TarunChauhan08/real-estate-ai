import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type LeadDto, Permission } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { AssignLeadDto } from './dto/assign-lead.dto';
import { CreateLeadDto } from './dto/create-lead.dto';
import { LeadQueryDto } from './dto/lead-query.dto';
import { LeadStatusDto } from './dto/lead-status.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';
import { LeadsService } from './leads.service';

const uuidPipe = new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Lead') });

/** Buyer leads of the active business. The tenant always comes from the caller's membership. */
@ApiTags('leads')
@ApiBearerAuth()
@Controller('leads')
export class LeadsController {
  constructor(private readonly leads: LeadsService) {}

  @Get()
  @RequirePermissions(Permission.LEADS_READ)
  @ApiOperation({ summary: 'List leads' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: LeadQueryDto,
  ): Promise<Paginated<LeadDto>> {
    return this.leads.list(ctx, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.LEADS_READ)
  @ApiOperation({ summary: 'Get one lead' })
  get(@CurrentTenant() ctx: TenantContext, @Param('id', uuidPipe) id: string): Promise<LeadDto> {
    return this.leads.get(ctx, id);
  }

  @Post()
  @RequirePermissions(Permission.LEADS_WRITE)
  @ApiOperation({ summary: 'Create a lead (phone is unique per business)' })
  create(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateLeadDto,
  ): Promise<LeadDto> {
    return this.leads.create(ctx, auth.userId, dto);
  }

  @Patch(':id')
  @RequirePermissions(Permission.LEADS_WRITE)
  @ApiOperation({ summary: 'Update lead details' })
  update(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateLeadDto,
  ): Promise<LeadDto> {
    return this.leads.update(ctx, auth.userId, id, dto);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.LEADS_WRITE)
  @ApiOperation({ summary: 'Move a lead through the pipeline' })
  changeStatus(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: LeadStatusDto,
  ): Promise<LeadDto> {
    return this.leads.changeStatus(ctx, auth.userId, id, dto);
  }

  @Patch(':id/assignee')
  @RequirePermissions(Permission.LEADS_ASSIGN)
  @ApiOperation({ summary: 'Assign a lead to a team member, or unassign with null' })
  assign(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: AssignLeadDto,
  ): Promise<LeadDto> {
    return this.leads.assign(ctx, auth.userId, id, dto);
  }
}
