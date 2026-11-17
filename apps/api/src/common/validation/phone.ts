import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
import { E164_PATTERN, normalizePhone } from '../utils/phone';

/**
 * Required phone field. Accepts numbers as people type them and stores E.164.
 * Input that cannot be normalised is passed through unchanged so the validator rejects it.
 */
export const PhoneNumber = (): PropertyDecorator =>
  applyDecorators(
    ApiProperty({ example: '98765 43210', description: 'Indian or international number' }),
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizePhone(value) ?? value) : value,
    ),
    IsString(),
    Matches(E164_PATTERN, { message: 'Enter a valid phone number, e.g. 98765 43210' }),
  );
