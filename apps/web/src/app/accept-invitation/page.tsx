import type { Metadata } from 'next';
import AuthLayout from '../(auth)/layout';
import { AcceptInvitation } from '@/features/auth/accept-invitation';

export const metadata: Metadata = {
  title: 'Accept invitation',
  referrer: 'no-referrer',
  robots: { index: false, follow: false },
};

export default function AcceptInvitationPage() {
  return (
    <AuthLayout>
      <AcceptInvitation />
    </AuthLayout>
  );
}
