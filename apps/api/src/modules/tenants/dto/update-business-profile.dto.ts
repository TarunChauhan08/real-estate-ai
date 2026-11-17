import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { BusinessType } from '../../../generated/prisma/enums';
import { OptionalCountry, OptionalPhone, OptionalText, OptionalWebsite } from './profile-fields';

export class UpdateBusinessProfileDto {
  @ApiPropertyOptional({ enum: BusinessType })
  @IsOptional()
  @IsEnum(BusinessType)
  businessType?: BusinessType;

  @OptionalPhone()
  phone?: string | null;

  @OptionalWebsite()
  website?: string | null;

  @OptionalText(100, 'Noida')
  city?: string | null;

  @OptionalText(100, 'Uttar Pradesh')
  state?: string | null;

  @OptionalCountry()
  country?: string;
}
