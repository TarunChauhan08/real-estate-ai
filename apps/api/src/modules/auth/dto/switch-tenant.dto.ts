import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class SwitchTenantDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId: string;
}
