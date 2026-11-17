import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { type CreateInvitationResponse, type InvitationDto, Permission } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type Paginated } from '../../common/interceptors/response-envelope.interceptor';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { InvitationQueryDto } from './dto/invitation-query.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('team')
@ApiBearerAuth()
@Controller('tenants/current/invitations')
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  @RequirePermissions(Permission.MEMBERS_INVITE)
  @ApiOperation({
    summary: 'Invite someone to the active business. Delivery status is reported honestly.',
  })
  create(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreateInvitationDto,
  ): Promise<CreateInvitationResponse> {
    return this.invitations.create(ctx, auth.userId, dto);
  }

  @Get()
  @RequirePermissions(Permission.MEMBERS_INVITE)
  @ApiOperation({ summary: 'List invitations for the active business' })
  list(
    @CurrentTenant() ctx: TenantContext,
    @Query() query: InvitationQueryDto,
  ): Promise<Paginated<InvitationDto>> {
    return this.invitations.list(ctx, query);
  }

  @Post(':id/revoke')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.MEMBERS_INVITE)
  @ApiOperation({ summary: 'Withdraw a pending invitation' })
  revoke(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Param('id', new ParseUUIDPipe({ exceptionFactory: () => Errors.notFound('Invitation') }))
    id: string,
  ): Promise<InvitationDto> {
    return this.invitations.revoke(ctx, auth.userId, id);
  }
}
