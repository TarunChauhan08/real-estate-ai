import type { Metadata } from 'next';
import { GuestOnly } from '@/features/auth/guest-only';
import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = { title: 'Register your business' };

export default function RegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}
