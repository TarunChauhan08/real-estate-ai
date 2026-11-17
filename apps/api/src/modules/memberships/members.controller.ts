import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type MemberDto, Permission } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { MemberQueryDto } from './dto/member-query.dto';
import { UpdateMemberRoleDto, UpdateMemberStatusDto } from './dto/update-member.dto';
import { TeamService } from './team.service';

const uuidPipe = new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Member') });

@ApiTags('team')
@ApiBearerAuth()
@Controller('tenants/current/members')
export class MembersController {
  constructor(private readonly team: TeamService) {}

  @Get()
  @RequirePermissions(Permission.MEMBERS_READ)
  @ApiOperation({ summary: 'List members of the active business' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Query() query: MemberQueryDto,
  ): Promise<Paginated<MemberDto>> {
    return this.team.list(ctx, auth.userId, query);
  }

  @Patch(':id/role')
  @RequirePermissions(Permission.MEMBERS_MANAGE)
  @ApiOperation({ summary: "Change a member's role (hierarchy and last-owner rules apply)" })
  changeRole(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateMemberRoleDto,
  ): Promise<MemberDto> {
    return this.team.changeRole(ctx, auth.userId, id, dto.role);
  }

  @Patch(':id/status')
  @RequirePermissions(Permission.MEMBERS_MANAGE)
  @ApiOperation({ summary: 'Suspend or reactivate a member' })
  changeStatus(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', uuidPipe) id: string,
    @Body() dto: UpdateMemberStatusDto,
  ): Promise<MemberDto> {
    return this.team.changeStatus(ctx, auth.userId, id, dto.status);
  }
}
