'use client';

import { useMutation } from '@tanstack/react-query';
import { type SendVerificationResponse } from '@rea/shared-types';
import { MailWarning } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/auth-provider';
import { api, ApiError } from '@/lib/api-client';

/** Gentle reminder until the user confirms their email (needed for password resets). */
export function VerifyEmailBanner() {
  const { session, reload } = useAuth();
  const [hidden, setHidden] = useState(false);
  const resend = useMutation({
    mutationFn: () =>
      api<SendVerificationResponse>('/auth/email/send-verification', { method: 'POST' }),
    onSuccess: async (result) => {
      if (result.alreadyVerified) {
        await reload();
        toast.success('Your email is already confirmed');
      } else toast.success(`Link sent to ${session?.user.email}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not send the email'),
  });

  if (!session || session.user.emailVerified || hidden) return null;
  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-attention/30 bg-attention-soft px-4 py-2.5 text-sm text-attention-fg sm:px-6 lg:px-10"
    >
      <p className="flex items-center gap-2">
        <MailWarning className="size-4 shrink-0" aria-hidden />
        Confirm your email <strong>{session.user.email}</strong> so you can reset your password if
        you ever forget it.
      </p>
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          loading={resend.isPending}
          onClick={() => resend.mutate()}
        >
          Send the link again
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setHidden(true)}>
          Later
        </Button>
      </div>
    </div>
  );
}
