import { ApiPropertyOptional } from '@nestjs/swagger';
import { PreferredLanguage, SUPPORTED_CURRENCIES, SUPPORTED_LOCALES } from '@rea/shared-types';
import { IsIn, IsOptional } from 'class-validator';
import { IsTimeZone } from '../../../common/validation/is-time-zone';

const LANGUAGES = Object.values(PreferredLanguage);

export class UpdateTenantSettingsDto {
  @ApiPropertyOptional({ example: 'Asia/Kolkata' })
  @IsOptional()
  @IsTimeZone()
  timezone?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_LOCALES })
  @IsOptional()
  @IsIn(SUPPORTED_LOCALES)
  locale?: string;

  @ApiPropertyOptional({ enum: SUPPORTED_CURRENCIES })
  @IsOptional()
  @IsIn(SUPPORTED_CURRENCIES)
  currency?: string;

  @ApiPropertyOptional({ enum: LANGUAGES })
  @IsOptional()
  @IsIn(LANGUAGES)
  preferredLanguage?: PreferredLanguage;
}
