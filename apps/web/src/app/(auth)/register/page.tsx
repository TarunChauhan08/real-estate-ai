import type { Metadata } from 'next';
import { OG_IMAGE } from '@/lib/site';
import { GuestOnly } from '@/features/auth/guest-only';
import { RegisterForm } from '@/features/auth/register-form';

export const metadata: Metadata = {
  title: 'Create your account — AI sales agent for real estate',
  description:
    'Create your account, add your listings and test your AI sales agent for real estate before any buyer sees it.',
  alternates: { canonical: '/register' },
  openGraph: { images: [OG_IMAGE] },
};

export default function RegisterPage() {
  return (
    <GuestOnly>
      <RegisterForm />
    </GuestOnly>
  );
}
