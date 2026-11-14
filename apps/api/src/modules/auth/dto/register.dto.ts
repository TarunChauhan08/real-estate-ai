import { ApiProperty } from '@nestjs/swagger';
import { Equals, IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validation/password';
import { NormalizeEmail, Trim } from '../../../common/validation/transforms';
import { BusinessType } from '../../../generated/prisma/enums';

export class RegisterDto {
  @ApiProperty({ example: 'Rahul Sharma' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @ApiProperty({ example: 'rahul@noidahomes.in' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email: string;

  @IsStrongPassword()
  password: string;

  @ApiProperty({ example: 'Noida Homes Brokerage' })
  @Trim()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  businessName: string;

  @ApiProperty({ enum: BusinessType })
  @IsEnum(BusinessType)
  businessType: BusinessType;

  @ApiProperty({ description: 'Must be true: the owner accepts the terms of service and privacy policy.' })
  @Equals(true, { message: 'You must accept the terms to create an account' })
  acceptTerms: boolean;
}
