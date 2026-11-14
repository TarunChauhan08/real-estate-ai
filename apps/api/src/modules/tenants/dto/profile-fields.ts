import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, IsUrl, Length, Matches, MaxLength, ValidateIf } from 'class-validator';
import { EmptyToNull } from '../../../common/validation/transforms';

/** Optional, clearable text field: empty string or null clears the value. */
export const OptionalText = (max: number, example?: string): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ nullable: true, maxLength: max, example }),
    EmptyToNull(),
    IsOptional(),
    IsString(),
    MaxLength(max),
  );

/** Phone number: digits with optional leading +, spaces or hyphens (7–20 chars). */
export const OptionalPhone = (): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ nullable: true, example: '+91 98765 43210' }),
    EmptyToNull(),
    IsOptional(),
    Matches(/^\+?[0-9][0-9 -]{5,18}[0-9]$/, { message: 'Enter a valid phone number' }),
  );

/**
 * http(s) website; empty clears it and a bare domain is upgraded to https://.
 * One transform, because the execution order of stacked @Transform decorators is not guaranteed.
 */
export const OptionalWebsite = (): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ nullable: true, example: 'https://noidahomes.in' }),
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      if (trimmed === '') return null;
      return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    }),
    IsOptional(),
    IsUrl({ protocols: ['http', 'https'], require_protocol: true }, { message: 'Enter a valid website URL' }),
    MaxLength(255),
  );

/** ISO 3166-1 alpha-2 country code. */
export const OptionalCountry = (): PropertyDecorator =>
  applyDecorators(
    ApiPropertyOptional({ example: 'IN' }),
    Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value)),
    ValidateIf((_o, value) => value !== undefined),
    IsString(),
    Length(2, 2),
    Matches(/^[A-Z]{2}$/),
  );
