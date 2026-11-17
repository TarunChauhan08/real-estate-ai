import { Module } from '@nestjs/common';
import { SiteVisitRemindersService } from './site-visit-reminders.service';
import { SiteVisitsController } from './site-visits.controller';
import { SiteVisitsService } from './site-visits.service';

@Module({
  controllers: [SiteVisitsController],
  providers: [SiteVisitsService, SiteVisitRemindersService],
  exports: [SiteVisitsService, SiteVisitRemindersService],
})
export class SiteVisitsModule {}
