import { Global, Logger, Module } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { FakeMailer, MAILER, type Mailer, ResendMailer } from './mailer';

@Global()
@Module({
  providers: [
    {
      provide: MAILER,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService): Mailer => {
        if (config.get('MAIL_PROVIDER') === 'resend') {
          new Logger('MailModule').log('Email provider: Resend');
          return new ResendMailer({
            apiKey: config.get('RESEND_API_KEY')!,
            from: config.get('MAIL_FROM'),
            replyTo: config.get('MAIL_REPLY_TO'),
          });
        }
        // Development: print emails (with their links) to the API log. Tests: stay quiet.
        return new FakeMailer(!config.isTest);
      },
    },
  ],
  exports: [MAILER],
})
export class MailModule {}
