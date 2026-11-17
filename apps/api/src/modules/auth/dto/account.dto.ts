import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength } from 'class-validator';
import { IsStrongPassword } from '../../../common/validation/password';
import { NormalizeEmail } from '../../../common/validation/transforms';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'rahul@noidahomes.in' })
  @NormalizeEmail()
  @IsEmail({}, { message: 'Enter a valid email address' })
  @MaxLength(254)
  email!: string;
}

export class TokenDto {
  @ApiProperty({ description: 'The token from the emailed link' })
  @IsString()
  @Length(20, 128)
  token!: string;
}

export class ResetPasswordDto extends TokenDto {
  @IsStrongPassword()
  password!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ format: 'password' })
  @IsString()
  @Length(1, 128)
  currentPassword!: string;

  @IsStrongPassword()
  newPassword!: string;
}
