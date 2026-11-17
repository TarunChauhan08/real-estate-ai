import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { PrismaService } from '../../database/prisma.service';
import { SiteVisitStatus } from '../../generated/prisma/enums';
import { SiteVisitsService } from './site-visits.service';

/** No reminder if the buyer was told about the visit this recently (it would be noise). */
const RECENTLY_CONFIRMED_MS = 60 * 60 * 1000;

/**
 * Sends each confirmed visit one WhatsApp reminder a few hours before it starts
 * (SITE_VISIT_REMINDER_MINUTES). Reminders cut no-shows, the most expensive failure in a
 * real estate funnel.
 *
 * Each reminder is claimed with a conditional update before it is sent, so even with several
 * API instances running this loop a buyer never gets the same reminder twice.
 */
@Injectable()
export class SiteVisitRemindersService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SiteVisitRemindersService.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly visits: SiteVisitsService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    const interval = this.config.get('SITE_VISIT_REMINDER_INTERVAL_MS');
    if (interval <= 0) return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.runOnce()
        .catch((error: unknown) =>
          this.logger.error(`Reminder run failed: ${(error as Error).message}`),
        )
        .finally(() => (this.running = null));
    }, interval);
    this.timer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }

  /** Sends every reminder that is due. Returns how many were sent. */
  async runOnce(now = new Date()): Promise<number> {
    const leadMs = this.config.get('SITE_VISIT_REMINDER_MINUTES') * 60 * 1000;
    const due = await this.prisma.siteVisit.findMany({
      where: {
        status: SiteVisitStatus.CONFIRMED,
        reminderSentAt: null,
        scheduledAt: { gt: now, lte: new Date(now.getTime() + leadMs) },
      },
      select: { id: true, tenantId: true, updatedAt: true },
      orderBy: { scheduledAt: 'asc' },
      take: 200,
    });

    let sent = 0;
    for (const visit of due) {
      const claimed = await this.prisma.siteVisit.updateMany({
        where: { id: visit.id, reminderSentAt: null, status: SiteVisitStatus.CONFIRMED },
        data: { reminderSentAt: now },
      });
      if (claimed.count !== 1) continue; // another instance took it
      if (now.getTime() - visit.updatedAt.getTime() < RECENTLY_CONFIRMED_MS) continue;
      const result = await this.visits.notifyBuyer(visit.tenantId, null, visit.id, 'reminder');
      if (result.sent) sent += 1;
      else this.logger.log(`Reminder for visit ${visit.id} not sent: ${result.reason}`);
    }
    return sent;
  }
}
