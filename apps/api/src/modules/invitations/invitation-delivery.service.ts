import { Injectable } from '@nestjs/common';
import { type InvitationDelivery } from '@rea/shared-types';
import { AppConfigService } from '../../config/app-config.service';

/**
 * Delivery of invitation links. No email provider exists in Phase 1, so nothing is ever sent
 * and the API says so explicitly. With INVITATION_DELIVERY=dev_link (rejected in production
 * by env validation) the link is returned once to the inviter for manual sharing.
 * The raw token is never logged.
 */
@Injectable()
export class InvitationDeliveryService {
  constructor(private readonly config: AppConfigService) {}

  deliver(token: string): InvitationDelivery {
    const delivery: InvitationDelivery = {
      status: 'not_sent',
      reason: 'Email delivery is not configured. Share the invitation link with the invitee yourself.',
    };
    if (this.config.get('INVITATION_DELIVERY') === 'dev_link' && !this.config.isProduction) {
      // A URL fragment is never sent to servers, so the token does not end up in access logs.
      delivery.devAcceptUrl = `${this.config.get('WEB_APP_URL')}/accept-invitation#token=${token}`;
    }
    return delivery;
  }
}
