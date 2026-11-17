import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  type CreateSiteVisitRequest,
  type SiteVisitScope,
  SiteVisitStatus,
  type UpdateSiteVisitRequest,
} from '@rea/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto';
import { Trim } from '../../../common/validation/transforms';

export const SITE_VISIT_SCOPES: SiteVisitScope[] = ['requested', 'upcoming', 'past'];

export class SiteVisitQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    enum: SITE_VISIT_SCOPES,
    description:
      'requested = waiting for the team to confirm · upcoming = confirmed, not yet happened · past = outcome recorded or slot passed',
  })
  @IsOptional()
  @IsIn(SITE_VISIT_SCOPES)
  scope?: SiteVisitScope;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  leadId?: string;
}

export class CreateSiteVisitDto implements CreateSiteVisitRequest {
  @ApiProperty()
  @IsUUID()
  leadId!: string;

  @ApiProperty({ example: '2026-11-21T05:30:00.000Z', description: 'Exact slot, ISO 8601' })
  @IsISO8601({ strict: true })
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  propertyId?: string;

  @ApiPropertyOptional({ description: 'Membership ID of the team member showing the property' })
  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @ApiPropertyOptional({ maxLength: 1000 })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyBuyer?: boolean;
}

export class UpdateSiteVisitDto implements UpdateSiteVisitRequest {
  @ApiPropertyOptional({ enum: SiteVisitStatus })
  @IsOptional()
  @IsEnum(SiteVisitStatus)
  status?: SiteVisitStatus;

  @ApiPropertyOptional({ description: 'Exact slot, ISO 8601. Required to confirm.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  scheduledAt?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  propertyId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsUUID()
  assignedToId?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 1000 })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Trim()
  @IsString()
  @MaxLength(1000)
  notes?: string | null;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  notifyBuyer?: boolean;
}
