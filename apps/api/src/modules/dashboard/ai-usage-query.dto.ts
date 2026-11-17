import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsOptional } from 'class-validator';

export const AI_USAGE_PERIODS = [7, 30, 90] as const;

export class AiUsageQueryDto {
  @ApiPropertyOptional({ enum: AI_USAGE_PERIODS, default: 30 })
  @IsOptional()
  @Type(() => Number)
  @IsIn(AI_USAGE_PERIODS, { message: 'days must be 7, 30 or 90' })
  days?: number;
}
