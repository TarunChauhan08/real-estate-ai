'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { type InvitationPreview, ROLE_LABELS, type SessionResponse } from '@rea/shared-types';
import { MailX } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { EmptyState } from '@/components/states/states';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { useAuth } from './auth-provider';
import { PasswordInput } from './password-input';
import { useFragmentToken } from './use-fragment-token';

interface Values {
  name: string;
  password: string;
}

export function AcceptInvitation() {
  const token = useFragmentToken();
  const router = useRouter();
  const { signIn } = useAuth();
  const preview = useQuery({
    queryKey: ['invitation-preview', token],
    queryFn: () =>
      api<InvitationPreview>('/invitations/preview', { method: 'POST', body: { token } }),
    enabled: Boolean(token),
    retry: false,
  });
  const form = useForm<Values>({ defaultValues: { name: '', password: '' } });
  const accept = useMutation({
    mutationFn: (values: Values) =>
      api<SessionResponse>('/invitations/accept', {
        method: 'POST',
        body: {
          token,
          password: values.password,
          ...(preview.data?.accountExists ? {} : { name: values.name }),
        },
      }),
    onSuccess: (session) => {
      signIn(session);
      router.replace('/dashboard');
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', {
          message: error instanceof ApiError ? error.message : 'Could not accept the invitation',
        });
      }
    },
  });

  if (token === undefined || (token && preview.isLoading)) return <Skeleton className="h-72" />;
  if (!token || preview.isError) {
    const message =
      preview.error instanceof ApiError
        ? preview.error.message
        : 'This invitation link is incomplete.';
    return (
      <EmptyState
        icon={MailX}
        title="This invitation can’t be used"
        description={`${message} Ask the person who invited you to send a new invitation.`}
        action={
          <Button asChild variant="secondary">
            <Link href="/login">Go to sign in</Link>
          </Button>
        }
      />
    );
  }
  const invitation = preview.data!;
  const { errors } = form.formState;

  return (
    <form onSubmit={form.handleSubmit((v) => accept.mutate(v))} noValidate className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-fg">Join {invitation.tenantName}</h1>
        <p className="mt-1 text-sm text-fg-muted">
          You have been invited as{' '}
          <strong className="text-fg-secondary">{ROLE_LABELS[invitation.role]}</strong> using{' '}
          <strong className="text-fg-secondary">{invitation.email}</strong>.
        </p>
      </div>
      {errors.root && <Alert tone="danger">{errors.root.message}</Alert>}
      {invitation.accountExists ? (
        <>
          <Alert tone="info">
            You already have an account. Enter your password to add this business to it.
          </Alert>
          <Field label="Password" error={errors.password?.message}>
            {(c) => (
              <PasswordInput
                {...c}
                autoComplete="current-password"
                autoFocus
                {...form.register('password', { required: 'Enter your password' })}
              />
            )}
          </Field>
        </>
      ) : (
        <>
          <Field label="Your name" error={errors.name?.message}>
            {(c) => (
              <Input
                {...c}
                autoComplete="name"
                autoFocus
                {...form.register('name', {
                  required: 'Enter your name',
                  minLength: { value: 2, message: 'Enter your name' },
                })}
              />
            )}
          </Field>
          <Field
            label="Create a password"
            error={errors.password?.message}
            hint="At least 10 characters, with a letter and a number."
          >
            {(c) => (
              <PasswordInput
                {...c}
                autoComplete="new-password"
                {...form.register('password', { required: 'Create a password' })}
              />
            )}
          </Field>
        </>
      )}
      <Button type="submit" size="lg" className="w-full" loading={accept.isPending}>
        Accept invitation
      </Button>
    </form>
  );
}
