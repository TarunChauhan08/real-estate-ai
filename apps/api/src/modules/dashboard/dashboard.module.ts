import { Module } from '@nestjs/common';
import { AiUsageService } from './ai-usage.service';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  controllers: [DashboardController],
  providers: [DashboardService, AiUsageService],
})
export class DashboardModule {}
