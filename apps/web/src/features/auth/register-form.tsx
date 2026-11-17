'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { BUSINESS_TYPE_LABELS, BusinessType, type SessionResponse } from '@rea/shared-types';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { useAuth } from './auth-provider';
import { PasswordInput } from './password-input';
import { homeFor } from './routing';
import { registerSchema, type RegisterValues } from './schemas';

export function RegisterForm() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { businessType: undefined },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const session = await api<SessionResponse>('/auth/register', {
        method: 'POST',
        body: values,
      });
      signIn(session);
      router.replace(homeFor(session));
    } catch (error) {
      if (error instanceof ApiError && error.code === 'EMAIL_TAKEN') {
        setError('email', {
          message: 'An account with this email already exists. Sign in instead.',
        });
      } else if (!applyFieldErrors(error, setError)) {
        setFormError(error instanceof ApiError ? error.message : 'Registration failed. Try again.');
      }
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Register your business</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Create the owner account. You can invite your team once you are in.
        </p>
      </div>

      {formError && <Alert tone="danger">{formError}</Alert>}

      <Field label="Your name" error={errors.name?.message}>
        {(control) => <Input {...control} autoComplete="name" autoFocus {...register('name')} />}
      </Field>
      <Field label="Business email" error={errors.email?.message}>
        {(control) => (
          <Input {...control} type="email" autoComplete="email" {...register('email')} />
        )}
      </Field>
      <Field
        label="Password"
        error={errors.password?.message}
        hint="At least 10 characters, with a letter and a number."
      >
        {(control) => (
          <PasswordInput {...control} autoComplete="new-password" {...register('password')} />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Business name" error={errors.businessName?.message}>
          {(control) => (
            <Input {...control} autoComplete="organization" {...register('businessName')} />
          )}
        </Field>
        <Field label="Business type" error={errors.businessType?.message}>
          {(control) => (
            <Select {...control} defaultValue="" {...register('businessType')}>
              <option value="" disabled>
                Choose…
              </option>
              {Object.values(BusinessType).map((type) => (
                <option key={type} value={type}>
                  {BUSINESS_TYPE_LABELS[type]}
                </option>
              ))}
            </Select>
          )}
        </Field>
      </div>

      <div className="space-y-1.5">
        <label className="flex items-start gap-3 text-sm text-fg-secondary">
          <input
            type="checkbox"
            className="mt-0.5 size-4 rounded border-line-strong accent-brand"
            aria-invalid={Boolean(errors.acceptTerms)}
            {...register('acceptTerms')}
          />
          <span>
            I accept the{' '}
            <a
              href="/terms"
              target="_blank"
              rel="noopener"
              className="font-semibold text-brand-fg underline"
            >
              Terms of Service
            </a>{' '}
            and{' '}
            <a
              href="/privacy"
              target="_blank"
              rel="noopener"
              className="font-semibold text-brand-fg underline"
            >
              Privacy Policy
            </a>{' '}
            on behalf of my business.
          </span>
        </label>
        {errors.acceptTerms && (
          <p role="alert" className="text-xs text-danger">
            {errors.acceptTerms.message}
          </p>
        )}
      </div>

      <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
        Create account
      </Button>

      <p className="text-center text-sm text-fg-muted">
        Already registered?{' '}
        <Link href="/login" className="font-semibold text-brand-fg hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
