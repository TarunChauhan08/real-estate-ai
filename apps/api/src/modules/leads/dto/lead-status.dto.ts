import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { LeadStatus } from '../../../generated/prisma/enums';

export class LeadStatusDto {
  @ApiProperty({ enum: LeadStatus })
  @IsEnum(LeadStatus)
  status!: LeadStatus;
}
