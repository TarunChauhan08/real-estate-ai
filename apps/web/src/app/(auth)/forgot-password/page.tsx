import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';
import { GuestOnly } from '@/features/auth/guest-only';

export const metadata: Metadata = {
  title: 'Forgot password',
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <GuestOnly>
      <ForgotPasswordForm />
    </GuestOnly>
  );
}
