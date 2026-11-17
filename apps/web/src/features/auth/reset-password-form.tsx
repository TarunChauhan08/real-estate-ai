'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { PasswordInput } from './password-input';
import { passwordSchema } from './schemas';
import { useFragmentToken } from './use-fragment-token';

const schema = z
  .object({ password: passwordSchema, confirm: z.string() })
  .refine((v) => v.password === v.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match',
  });

export function ResetPasswordForm() {
  const token = useFragmentToken();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  if (token === undefined) return <Skeleton className="h-64" />;
  if (!token)
    return (
      <EmptyState
        icon={KeyRound}
        title="This link is incomplete"
        description="Open the link from your email again, or ask for a new one."
        action={
          <Button asChild>
            <Link href="/forgot-password">Ask for a new link</Link>
          </Button>
        }
      />
    );

  if (done)
    return (
      <div className="space-y-5" role="status">
        <h1 className="text-2xl font-bold tracking-tight text-fg">Password changed</h1>
        <p className="text-sm text-fg-muted">
          For your security, you have been signed out on every device. Sign in with your new
          password.
        </p>
        <Button asChild size="lg" className="w-full">
          <Link href="/login">Sign in</Link>
        </Button>
      </div>
    );

  const onSubmit = form.handleSubmit(async ({ password }) => {
    setError(null);
    try {
      await api('/auth/password/reset', { method: 'POST', body: { token, password } });
      setDone(true);
    } catch (e) {
      if (!applyFieldErrors(e, form.setError))
        setError(e instanceof ApiError ? e.message : 'The password was not changed. Try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Choose a new password</h1>
        <p className="mt-1 text-sm text-fg-muted">
          At least 10 characters, with a letter and a number.
        </p>
      </div>
      {error && (
        <Alert tone="danger">
          {error}{' '}
          <Link href="/forgot-password" className="font-semibold underline">
            Ask for a new link
          </Link>
        </Alert>
      )}
      <Field label="New password" error={form.formState.errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            autoComplete="new-password"
            autoFocus
            {...form.register('password')}
          />
        )}
      </Field>
      <Field label="Repeat new password" error={form.formState.errors.confirm?.message}>
        {(control) => (
          <PasswordInput {...control} autoComplete="new-password" {...form.register('confirm')} />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Save new password
      </Button>
    </form>
  );
}
