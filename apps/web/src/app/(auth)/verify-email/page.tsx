import type { Metadata } from 'next';
import { VerifyEmail } from '@/features/auth/verify-email';

export const metadata: Metadata = {
  title: 'Confirm your email',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function VerifyEmailPage() {
  return <VerifyEmail />;
}
