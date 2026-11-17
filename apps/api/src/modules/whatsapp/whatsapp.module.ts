import { Global, Logger, Module } from '@nestjs/common';
import { SecretBox } from '../../common/utils/secret-box';
import { AppConfigService } from '../../config/app-config.service';
import { CloudApiWhatsAppClient } from './client/cloud-api.client';
import { FakeWhatsAppClient } from './client/fake.client';
import { WHATSAPP_CLIENT, type WhatsAppClient } from './client/whatsapp-client';
import { SECRET_BOX, WhatsAppAccountsService } from './whatsapp-accounts.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppDeliveryService } from './whatsapp-delivery.service';

/**
 * WhatsApp connection settings and outbound delivery. Incoming webhooks live in
 * WhatsAppWebhookModule, which builds on ConversationsModule.
 */
@Global()
@Module({
  controllers: [WhatsAppController],
  providers: [
    {
      provide: WHATSAPP_CLIENT,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): WhatsAppClient => {
        const logger = new Logger('WhatsAppModule');
        if (config.get('WHATSAPP_PROVIDER') === 'cloud') {
          logger.log(
            `WhatsApp provider: Meta Cloud API (${config.get('WHATSAPP_GRAPH_API_VERSION')})`,
          );
          return new CloudApiWhatsAppClient({
            baseUrl: config.get('WHATSAPP_GRAPH_BASE_URL'),
            apiVersion: config.get('WHATSAPP_GRAPH_API_VERSION'),
            timeoutMs: config.get('WHATSAPP_TIMEOUT_MS'),
          });
        }
        if (!config.isTest)
          logger.warn(
            'WhatsApp provider: fake (replies are recorded, not sent). Set WHATSAPP_PROVIDER=cloud to go live.',
          );
        return new FakeWhatsAppClient();
      },
    },
    {
      provide: SECRET_BOX,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): SecretBox => {
        const key = config.get('DATA_ENCRYPTION_KEY');
        if (key) return new SecretBox(Buffer.from(key, 'base64'));
        // Production refuses to start without a key (env validation); this is dev/test only.
        if (!config.isTest)
          new Logger('WhatsAppModule').warn(
            'DATA_ENCRYPTION_KEY is not set; using a development key derived from JWT_ACCESS_SECRET.',
          );
        return SecretBox.fromPassphrase(config.get('JWT_ACCESS_SECRET'));
      },
    },
    WhatsAppAccountsService,
    WhatsAppDeliveryService,
  ],
  exports: [WHATSAPP_CLIENT, WhatsAppAccountsService, WhatsAppDeliveryService],
})
export class WhatsAppModule {}
