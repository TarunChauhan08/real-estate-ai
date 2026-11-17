import { Module } from '@nestjs/common';
import { PropertyImportService } from './import/property-import.service';
import { PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  controllers: [PropertiesController],
  providers: [PropertiesService, PropertyImportService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
