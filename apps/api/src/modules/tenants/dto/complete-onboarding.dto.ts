import { ApiProperty } from '@nestjs/swagger';
import { PreferredLanguage } from '@rea/shared-types';
import { IsEnum, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { IsTimeZone } from '../../../common/validation/is-time-zone';
import { Trim } from '../../../common/validation/transforms';
import { BusinessType } from '../../../generated/prisma/enums';
import { OptionalPhone, OptionalWebsite } from './profile-fields';

/** Business details collected on the onboarding screen. Completing it activates the tenant. */
export class CompleteOnboardingDto {
  @ApiProperty({ example: 'Noida Homes Brokerage' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @OptionalPhone()
  phone?: string | null;

  @OptionalWebsite()
  website?: string | null;

  @ApiProperty({ example: 'Noida' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: 'Uttar Pradesh' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  state: string;

  @ApiProperty({ example: 'Asia/Kolkata' })
  @IsTimeZone()
  timezone: string;

  @ApiProperty({ enum: Object.values(PreferredLanguage) })
  @IsIn(Object.values(PreferredLanguage))
  preferredLanguage: PreferredLanguage;
}
