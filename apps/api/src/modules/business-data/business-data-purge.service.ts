import { Injectable, Logger, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';
import { BusinessDataService } from './business-data.service';

/** Runs the deletion purge on a timer (TENANT_PURGE_INTERVAL_MS; 0 turns it off). */
@Injectable()
export class BusinessDataPurgeService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(BusinessDataPurgeService.name);
  private timer: NodeJS.Timeout | null = null;
  private running: Promise<unknown> | null = null;

  constructor(
    private readonly data: BusinessDataService,
    private readonly config: AppConfigService,
  ) {}

  onModuleInit(): void {
    const interval = this.config.get('TENANT_PURGE_INTERVAL_MS');
    if (interval <= 0) return;
    this.timer = setInterval(() => {
      if (this.running) return;
      this.running = this.data
        .purgeDue()
        .catch((error: unknown) =>
          this.logger.error(`Purge run failed: ${(error as Error).message}`),
        )
        .finally(() => (this.running = null));
    }, interval);
    this.timer.unref();
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.timer) clearInterval(this.timer);
    await this.running;
  }
}
