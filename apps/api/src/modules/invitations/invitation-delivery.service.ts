import { Inject, Injectable, Logger } from '@nestjs/common';
import { type InvitationDelivery, type MembershipRole, ROLE_LABELS } from '@rea/shared-types';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { MAILER, type Mailer } from '../mail/mailer';
import { invitationEmail } from '../mail/templates';

export interface InvitationToDeliver {
  token: string;
  email: string;
  role: MembershipRole;
  expiresAt: Date;
  tenantId: string;
  inviterId: string;
}

/**
 * Sends the invitation by email. If email is not set up (development) or the provider fails, the
 * API says so plainly; with INVITATION_DELIVERY=dev_link (never in production) the link is also
 * returned once to the inviter. The raw token is never logged.
 */
@Injectable()
export class InvitationDeliveryService {
  private readonly logger = new Logger(InvitationDeliveryService.name);

  constructor(
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async deliver(input: InvitationToDeliver): Promise<InvitationDelivery> {
    // A URL fragment is never sent to servers, so the token does not end up in access logs.
    const url = `${this.config.get('WEB_APP_URL')}/accept-invitation#token=${input.token}`;
    const devLink =
      this.config.get('INVITATION_DELIVERY') === 'dev_link' && !this.config.isProduction
        ? { devAcceptUrl: url }
        : {};

    if (this.mailer.name === 'fake') {
      return {
        status: 'not_sent',
        reason:
          'Email delivery is not configured. Share the invitation link with the invitee yourself.',
        ...devLink,
      };
    }

    const [tenant, inviter] = await Promise.all([
      this.prisma.tenant.findUnique({ where: { id: input.tenantId }, select: { name: true } }),
      this.prisma.user.findUnique({ where: { id: input.inviterId }, select: { name: true } }),
    ]);
    try {
      await this.mailer.send(
        invitationEmail({
          to: input.email,
          inviterName: inviter?.name ?? 'Your team',
          businessName: tenant?.name ?? 'your team',
          roleLabel: ROLE_LABELS[input.role].toLowerCase(),
          url,
          expiresAt: input.expiresAt,
        }),
      );
      return { status: 'sent', reason: null };
    } catch (error) {
      this.logger.error(`Invitation email failed: ${(error as Error).message}`);
      return {
        status: 'not_sent',
        reason:
          'The invitation was created, but the email could not be sent. Try inviting this person again in a few minutes.',
        ...devLink,
      };
    }
  }
}
