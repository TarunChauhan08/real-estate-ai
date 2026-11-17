import { Body, Controller, Delete, Get, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, type WhatsAppStatusDto } from '@rea/shared-types';
import { CurrentAuth, CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { type AuthContext, type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';
import { WhatsAppAccountsService } from './whatsapp-accounts.service';

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels/whatsapp')
export class WhatsAppController {
  constructor(private readonly accounts: WhatsAppAccountsService) {}

  @Get()
  @RequirePermissions(Permission.SETTINGS_READ)
  @ApiOperation({ summary: 'WhatsApp connection status (the access token is never returned)' })
  status(@CurrentTenant() ctx: TenantContext): Promise<WhatsAppStatusDto> {
    return this.accounts.status(ctx.tenantId);
  }

  @Put()
  @RequirePermissions(Permission.CHANNELS_MANAGE)
  @ApiOperation({ summary: 'Connect or replace the business WhatsApp number' })
  connect(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
    @Body() dto: ConnectWhatsAppDto,
  ): Promise<WhatsAppStatusDto> {
    return this.accounts.connect(ctx, auth.userId, dto);
  }

  @Delete()
  @RequirePermissions(Permission.CHANNELS_MANAGE)
  @ApiOperation({ summary: 'Disconnect WhatsApp. Conversations and messages are kept.' })
  disconnect(
    @CurrentTenant() ctx: TenantContext,
    @CurrentAuth() auth: AuthContext,
  ): Promise<WhatsAppStatusDto> {
    return this.accounts.disconnect(ctx, auth.userId);
  }
}
