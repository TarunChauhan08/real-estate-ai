import { BusinessType } from '@rea/shared-types';
import { z } from 'zod';

// Mirrors the API's password policy so users get instant feedback; the API re-validates.
export const passwordSchema = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use at most 128 characters')
  .regex(/[A-Za-z]/, 'Include at least one letter')
  .regex(/\d/, 'Include at least one number');

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name').max(120),
  email: z.string().trim().min(1, 'Enter your business email').email('Enter a valid email address'),
  password: passwordSchema,
  businessName: z.string().trim().min(2, 'Enter your business name').max(120),
  businessType: z.nativeEnum(BusinessType, { errorMap: () => ({ message: 'Choose your business type' }) }),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to create your account' }) }),
});
export type RegisterValues = z.infer<typeof registerSchema>;
