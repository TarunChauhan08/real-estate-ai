'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api-client';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email').email('Enter a valid email address'),
});

export function ForgotPasswordForm() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema) });

  const onSubmit = form.handleSubmit(async ({ email }) => {
    setError(null);
    try {
      await api('/auth/password/forgot', { method: 'POST', body: { email } });
      setSentTo(email);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
    }
  });

  if (sentTo) {
    return (
      <div className="space-y-5" role="status">
        <MailCheck className="size-10 text-gold-deep" aria-hidden />
        <h1 className="text-2xl font-bold tracking-tight text-fg">Check your email</h1>
        <p className="text-sm leading-relaxed text-fg-muted">
          If an account exists for <strong className="text-fg">{sentTo}</strong>, we have sent a
          link to choose a new password. It works once and expires in an hour. Check your spam
          folder if it does not arrive in a few minutes.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-semibold text-brand-fg hover:underline"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Forgot your password?</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Enter the email you sign in with and we will send you a link to choose a new one.
        </p>
      </div>
      {error && <Alert tone="danger">{error}</Alert>}
      <Field label="Email" error={form.formState.errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            type="email"
            autoComplete="email"
            autoFocus
            {...form.register('email')}
          />
        )}
      </Field>
      <Button type="submit" size="lg" className="w-full" loading={form.formState.isSubmitting}>
        Send reset link
      </Button>
      <p className="text-center text-sm text-fg-muted">
        Remembered it?{' '}
        <Link href="/login" className="font-semibold text-brand-fg hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
