import { applyDecorators } from '@nestjs/common';
import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** Password policy for new passwords: 10–128 characters with at least one letter and one digit. */
export function IsStrongPassword(): PropertyDecorator {
  return applyDecorators(
    ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH, format: 'password' }),
    IsString(),
    MinLength(PASSWORD_MIN_LENGTH, { message: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }),
    MaxLength(PASSWORD_MAX_LENGTH, { message: `Password must be at most ${PASSWORD_MAX_LENGTH} characters` }),
    Matches(/[A-Za-z]/, { message: 'Password must contain a letter' }),
    Matches(/\d/, { message: 'Password must contain a number' }),
  );
}

/** Same policy as @IsStrongPassword(), for checks that depend on runtime state. */
export function passwordPolicyViolations(password: string): string[] {
  const problems: string[] = [];
  if (password.length < PASSWORD_MIN_LENGTH) problems.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters`);
  if (password.length > PASSWORD_MAX_LENGTH) problems.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters`);
  if (!/[A-Za-z]/.test(password)) problems.push('Password must contain a letter');
  if (!/\d/.test(password)) problems.push('Password must contain a number');
  return problems;
}
