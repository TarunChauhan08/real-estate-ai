import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BusinessDataPurgeService } from './business-data-purge.service';
import { BusinessDataController } from './business-data.controller';
import { BusinessDataService } from './business-data.service';

@Module({
  imports: [AuthModule],
  controllers: [BusinessDataController],
  providers: [BusinessDataService, BusinessDataPurgeService],
  exports: [BusinessDataService],
})
export class BusinessDataModule {}
