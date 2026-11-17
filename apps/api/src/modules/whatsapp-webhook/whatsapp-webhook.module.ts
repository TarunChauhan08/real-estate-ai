import { Module } from '@nestjs/common';
import { ConversationsModule } from '../conversations/conversations.module';
import { WhatsAppInboundService } from './whatsapp-inbound.service';
import { WhatsAppSimulatorController } from './whatsapp-simulator.controller';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller';

/** Incoming WhatsApp traffic: Meta's webhook and the demo-mode simulator. */
@Module({
  imports: [ConversationsModule],
  controllers: [WhatsAppWebhookController, WhatsAppSimulatorController],
  providers: [WhatsAppInboundService],
  exports: [WhatsAppInboundService],
})
export class WhatsAppWebhookModule {}
