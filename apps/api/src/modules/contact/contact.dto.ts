import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { type ContactRequest } from '@rea/shared-types';
import { IsEmail, IsOptional, IsString, Length, MaxLength } from 'class-validator';
import { PhoneNumber } from '../../common/validation/phone';
import { NormalizeEmail, Trim } from '../../common/validation/transforms';

export class ContactRequestDto implements ContactRequest {
  @ApiProperty({ example: 'Rahul Sharma' })
  @Trim()
  @IsString()
  @Length(2, 120, { message: 'Enter your name' })
  name!: string;

  @ApiProperty({ example: 'rahul@noidahomes.in' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @PhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'Noida Homes Brokerage' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(160)
  company?: string;

  @ApiPropertyOptional({ example: 'Noida' })
  @IsOptional()
  @Trim()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiProperty({ example: 'We get about 300 WhatsApp enquiries a month and would like a demo.' })
  @Trim()
  @IsString()
  @Length(10, 3000, { message: 'Tell us a little more (at least 10 characters)' })
  message!: string;

  @ApiPropertyOptional({ description: 'Page the request came from' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  source?: string;

  /** Honeypot: hidden from people, filled in by bots. Must stay empty. */
  @ApiPropertyOptional({ description: 'Leave empty' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}
