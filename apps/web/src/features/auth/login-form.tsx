'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { type SessionResponse } from '@rea/shared-types';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api, ApiError } from '@/lib/api-client';
import { useAuth } from './auth-provider';
import { PasswordInput } from './password-input';
import { homeFor, safeNext } from './routing';
import { loginSchema, type LoginValues } from './schemas';

export function LoginForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const next = safeNext(useSearchParams().get('next'));
  const [formError, setFormError] = useState<string | null>(null);
  const [showReset, setShowReset] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await api<SessionResponse>('/auth/login', { method: 'POST', body: values });
      signIn(session);
      router.replace(next ?? homeFor(session));
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Sign-in failed. Try again.');
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Sign in</h1>
        <p className="mt-1 text-sm text-fg-muted">Welcome back. Sign in to your business workspace.</p>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="Email" error={errors.email?.message}>
        {(control) => <Input {...control} type="email" autoComplete="email" autoFocus {...register('email')} />}
      </Field>
      <Field label="Password" error={errors.password?.message}>
        {(control) => <PasswordInput {...control} autoComplete="current-password" {...register('password')} />}
      </Field>

      <div className="-mt-2 flex justify-end">
        <button type="button" className="text-sm font-medium text-brand-fg hover:underline" onClick={() => setShowReset((v) => !v)} aria-expanded={showReset}>
          Forgot password?
        </button>
      </div>
      {showReset && (
        <Alert tone="info" title="Password reset is not available yet">
          Self-service password reset is coming in a later release. Until then, ask your business owner or contact support.
        </Alert>
      )}

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Sign in
      </Button>

      <p className="text-center text-sm text-fg-muted">
        New to the platform?{' '}
        <Link href="/register" className="font-semibold text-brand-fg hover:underline">
          Register your business
        </Link>
      </p>
    </form>
  );
}
