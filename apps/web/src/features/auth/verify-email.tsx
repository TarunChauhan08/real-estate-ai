'use client';

import { BadgeCheck, MailX } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { EmptyState } from '@/components/states/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from './auth-provider';
import { useFragmentToken } from './use-fragment-token';

/** Confirms the email as soon as the page opens — the link itself is the confirmation. */
export function VerifyEmail() {
  const token = useFragmentToken();
  const { status, reload } = useAuth();
  const [result, setResult] = useState<'ok' | string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    api('/auth/email/verify', { method: 'POST', body: { token } })
      .then(async () => {
        setResult('ok');
        if (status === 'authenticated') await reload();
      })
      .catch((e: unknown) =>
        setResult(
          e instanceof ApiError ? e.message : 'We could not confirm your email. Try again.',
        ),
      );
  }, [token, status, reload]);

  const next = status === 'authenticated' ? '/dashboard' : '/login';
  if (token === undefined || (token && result === null)) return <Skeleton className="h-48" />;
  if (result === 'ok')
    return (
      <EmptyState
        icon={BadgeCheck}
        title="Email confirmed"
        description="Thank you. Password resets and important account messages will reach you here."
        action={
          <Button asChild>
            <Link href={next}>{status === 'authenticated' ? 'Go to dashboard' : 'Sign in'}</Link>
          </Button>
        }
      />
    );
  return (
    <EmptyState
      icon={MailX}
      title="This link did not work"
      description={
        typeof result === 'string'
          ? `${result} You can send a new link from the banner in your dashboard.`
          : 'Open the link from your email again.'
      }
      action={
        <Button asChild variant="secondary">
          <Link href={next}>{status === 'authenticated' ? 'Go to dashboard' : 'Sign in'}</Link>
        </Button>
      }
    />
  );
}
