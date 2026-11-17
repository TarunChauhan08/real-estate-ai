'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { FullPageLoader } from '@/components/states/states';
import { useAuth } from './auth-provider';
import { homeFor } from './routing';

/** Sends already signed-in users away from the login and registration screens. */
export function GuestOnly({ children }: { children: React.ReactNode }) {
  const { status, session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated' && session) router.replace(homeFor(session));
  }, [status, session, router]);

  if (status !== 'unauthenticated') return <FullPageLoader label="Checking your session" />;
  return <>{children}</>;
}
