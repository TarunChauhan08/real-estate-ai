import type { Metadata } from 'next';
import { Suspense } from 'react';
import { GuestOnly } from '@/features/auth/guest-only';
import { LoginForm } from '@/features/auth/login-form';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: true },
  alternates: { canonical: '/login' },
};

export default function LoginPage() {
  return (
    <GuestOnly>
      <Suspense>
        <LoginForm />
      </Suspense>
    </GuestOnly>
  );
}
