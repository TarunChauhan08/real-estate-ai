import { Inject, Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { MAILER, type Mailer } from '../mail/mailer';
import { escapeHtml } from '../mail/templates';
import { type ContactRequestDto } from './contact.dto';

/**
 * Demo and contact requests from the public website. Stored first (so nothing is lost), then
 * emailed to CONTACT_NOTIFICATION_EMAIL if set.
 */
@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(MAILER) private readonly mailer: Mailer,
  ) {}

  async submit(dto: ContactRequestDto): Promise<void> {
    // Bots fill every field. Pretend it worked so they do not adapt.
    if (dto.website) return;

    const saved = await this.prisma.contactRequest.create({
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone ?? null,
        company: dto.company || null,
        city: dto.city || null,
        message: dto.message,
        source: dto.source?.slice(0, 200) || null,
      },
    });

    const to = this.config.get('CONTACT_NOTIFICATION_EMAIL');
    if (!to) return;
    const rows: Array<[string, string | null]> = [
      ['Name', saved.name],
      ['Email', saved.email],
      ['Phone', saved.phone],
      ['Company', saved.company],
      ['City', saved.city],
      ['Page', saved.source],
    ];
    try {
      await this.mailer.send({
        to,
        subject: `Demo request: ${saved.name}${saved.company ? ` (${saved.company})` : ''}`,
        text: [...rows.filter(([, v]) => v).map(([k, v]) => `${k}: ${v}`), '', saved.message].join(
          '\n',
        ),
        html: `<table>${rows
          .filter(([, v]) => v)
          .map(([k, v]) => `<tr><td><strong>${k}</strong></td><td>${escapeHtml(v!)}</td></tr>`)
          .join('')}</table><p style="white-space:pre-wrap">${escapeHtml(saved.message)}</p>`,
      });
    } catch (error) {
      this.logger.error(`Contact notification failed: ${(error as Error).message}`);
    }
  }
}
