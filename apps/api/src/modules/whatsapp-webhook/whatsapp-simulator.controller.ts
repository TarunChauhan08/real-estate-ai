import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permission, type SimulateWhatsAppResultDto } from '@rea/shared-types';
import { randomUUID } from 'node:crypto';
import { CurrentTenant } from '../../common/decorators/current-auth.decorator';
import { Errors } from '../../common/errors/app.exception';
import { type TenantContext } from '../auth/auth-context';
import { RequirePermissions } from '../roles/require-permissions.decorator';
import { WhatsAppAccountsService } from '../whatsapp/whatsapp-accounts.service';
import { SimulateWhatsAppDto } from './dto/simulate-whatsapp.dto';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

/**
 * Demo mode only (fake provider, never in production): pretend a buyer messaged the business on
 * WhatsApp. It runs the exact same path as a real webhook — lead, conversation, AI reply,
 * delivery — so the whole flow can be tried before a Meta account exists.
 */
@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels/whatsapp/simulate')
export class WhatsAppSimulatorController {
  constructor(
    private readonly accounts: WhatsAppAccountsService,
    private readonly inbound: WhatsAppInboundService,
  ) {}

  @Post()
  @HttpCode(200)
  @RequirePermissions(Permission.CONVERSATIONS_WRITE)
  @ApiOperation({ summary: 'Demo mode: simulate a buyer sending a WhatsApp message' })
  async simulate(
    @CurrentTenant() ctx: TenantContext,
    @Body() dto: SimulateWhatsAppDto,
  ): Promise<SimulateWhatsAppResultDto> {
    if (!this.accounts.simulatorEnabled) throw Errors.notFound('Route');
    const account = await this.accounts.resolveByTenant(ctx.tenantId);
    if (!account) {
      throw Errors.conflict(
        'WHATSAPP_NOT_CONNECTED',
        'Connect a WhatsApp number in Integrations first.',
      );
    }
    const [result] = await this.inbound.process(
      [
        {
          kind: 'message',
          phoneNumberId: account.phoneNumberId,
          from: dto.from,
          profileName: dto.name ?? null,
          externalId: `wamid.sim-${randomUUID()}`,
          receivedAt: new Date(),
          type: 'text',
          content: dto.text,
        },
      ],
      { debounce: false },
    );
    if (!result) throw Errors.conflict('WHATSAPP_NOT_CONNECTED', 'WhatsApp is not connected.');
    return result;
  }
}
