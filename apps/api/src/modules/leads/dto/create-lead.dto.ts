import { applyDecorators } from '@nestjs/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MAX_PRICE_RUPEES } from '@rea/shared-types';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  CleanStringList,
  EmptyToNull,
  NormalizeEmail,
  Trim,
} from '../../../common/validation/transforms';
import { PhoneNumber } from '../../../common/validation/phone';
import {
  LeadPurpose,
  LeadSource,
  LeadTemperature,
  PurchaseTimeline,
} from '../../../generated/prisma/enums';
import { OptionalText } from '../../tenants/dto/profile-fields';

export const LEAD_LANGUAGES = ['en', 'hi', 'hinglish'] as const;

const OptionalBudget = (): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({
      nullable: true,
      minimum: 0,
      maximum: MAX_PRICE_RUPEES,
      description: 'Whole rupees',
    }),
    IsOptional(),
    IsInt(),
    Min(0),
    Max(MAX_PRICE_RUPEES),
  );

export class CreateLeadDto {
  @ApiProperty({ example: 'Rahul Sharma', minLength: 2, maxLength: 120 })
  @Trim()
  @IsString()
  @Length(2, 120)
  name!: string;

  @ApiProperty({ example: '98765 43210', description: 'Normalised to E.164 (+919876543210)' })
  @PhoneNumber()
  phone!: string;

  @ApiPropertyOptional({ nullable: true })
  @NormalizeEmail()
  @EmptyToNull()
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  email?: string | null;

  @ApiPropertyOptional({ enum: LeadSource })
  @IsOptional()
  @IsEnum(LeadSource)
  source?: LeadSource;

  @ApiPropertyOptional({ enum: LeadTemperature })
  @IsOptional()
  @IsEnum(LeadTemperature)
  temperature?: LeadTemperature;

  @OptionalBudget()
  budgetMin?: number | null;

  @OptionalBudget()
  budgetMax?: number | null;

  @OptionalText(100, 'Noida')
  preferredCity?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @CleanStringList()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(100, { each: true })
  preferredLocalities?: string[];

  @ApiPropertyOptional({ type: [Number], example: [2, 3] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsInt({ each: true })
  @Min(0, { each: true })
  @Max(20, { each: true })
  preferredBedrooms?: number[];

  @ApiPropertyOptional({ enum: LeadPurpose, nullable: true })
  @IsOptional()
  @IsEnum(LeadPurpose)
  purpose?: LeadPurpose | null;

  @ApiPropertyOptional({ enum: PurchaseTimeline, nullable: true })
  @IsOptional()
  @IsEnum(PurchaseTimeline)
  timeline?: PurchaseTimeline | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsBoolean()
  needsHomeLoan?: boolean | null;

  @ApiPropertyOptional({ enum: LEAD_LANGUAGES, nullable: true })
  @IsOptional()
  @IsIn(LEAD_LANGUAGES)
  preferredLanguage?: string | null;

  @OptionalText(5000)
  notes?: string | null;
}
