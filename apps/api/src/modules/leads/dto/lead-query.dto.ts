import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Trim } from '../../../common/validation/transforms';
import { LeadSource, LeadStatus, LeadTemperature } from '../../../generated/prisma/enums';

export const LEAD_SORTS = ['newest', 'oldest', 'name'] as const;
export type LeadSort = (typeof LEAD_SORTS)[number];

export class LeadQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Search name, phone or email' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional({ enum: LeadStatus })
  @IsOptional()
  @IsEnum(LeadStatus)
  status?: LeadStatus;

  @ApiPropertyOptional({ enum: LeadTemperature })
  @IsOptional()
  @IsEnum(LeadTemperature)
  temperature?: LeadTemperature;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ description: 'Membership ID' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ enum: LEAD_SORTS })
  @IsOptional()
  @IsIn(LEAD_SORTS)
  sort?: LeadSort;
}
