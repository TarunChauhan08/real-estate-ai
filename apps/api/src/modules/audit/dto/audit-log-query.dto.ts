import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsISO8601, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';

export class AuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'member.role_changed' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(/^[a-z_.]+$/)
  action?: string;

  @ApiPropertyOptional({ example: 'membership' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  @Matches(/^[a-z_]+$/)
  entityType?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  actorId?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsISO8601()
  to?: string;
}
