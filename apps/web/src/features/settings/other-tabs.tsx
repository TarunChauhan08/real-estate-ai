'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  type MeResponse,
  MembershipRole,
  Permission,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
} from '@rea/shared-types';
import { Check, Minus } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { Field } from '@/components/ui/field';
import { useAuth } from '@/features/auth/auth-provider';
import { PasswordInput } from '@/features/auth/password-input';
import { passwordSchema } from '@/features/auth/schemas';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export function AccountTab() {
  const me = useQuery({ queryKey: queryKeys.me, queryFn: () => api<MeResponse>('/auth/me') });
  if (!me.data) return <Skeleton className="h-48" />;
  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader title="Your account" />
        <dl className="grid gap-5 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-fg-muted">Name</dt>
            <dd className="mt-1 text-sm font-medium text-fg">{me.data.user.name}</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Email</dt>
            <dd className="mt-1 flex items-center gap-2 text-sm font-medium text-fg">
              {me.data.user.email}
              {me.data.user.emailVerified ? (
                <Badge tone="success">Confirmed</Badge>
              ) : (
                <Badge tone="warning">Not confirmed</Badge>
              )}
            </dd>
          </div>
        </dl>
        <p className="border-t border-subtle px-5 py-3 text-xs text-fg-muted">
          Changing your name or email is not available yet.
        </p>
      </Panel>
      <Panel>
        <PanelHeader
          title="Your businesses"
          description="Switch between them from the business menu at the top of the page."
        />
        <ul className="divide-y divide-subtle">
          {me.data.memberships.map((m) => (
            <li key={m.membershipId} className="flex items-center gap-3 px-5 py-3 text-sm">
              <span className="flex-1 font-medium text-fg">{m.tenant.name}</span>
              {m.tenant.id === me.data.activeTenant?.id && <Badge tone="ink">Current</Badge>}
              <span className="text-fg-muted">{ROLE_LABELS[m.role]}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

const PERMISSION_ROWS: Array<{ permission: Permission; label: string }> = [
  { permission: Permission.TENANT_READ, label: 'View business information' },
  { permission: Permission.TENANT_UPDATE, label: 'Edit business profile' },
  { permission: Permission.SETTINGS_UPDATE, label: 'Change preferences' },
  { permission: Permission.MEMBERS_READ, label: 'See team members' },
  { permission: Permission.MEMBERS_INVITE, label: 'Invite members' },
  { permission: Permission.MEMBERS_MANAGE, label: 'Change roles and disable members' },
  { permission: Permission.AUDIT_READ, label: 'View audit log' },
];
const ROLES = Object.values(MembershipRole);

export function TeamTab() {
  return (
    <Panel>
      <PanelHeader
        title="Roles and permissions"
        description="What each role can do. Members can only manage people in roles below their own."
        actions={
          <Button asChild variant="secondary" size="sm">
            <Link href="/dashboard/team">Manage team</Link>
          </Button>
        }
      />
      <div
        className="overflow-x-auto"
        tabIndex={0}
        role="region"
        aria-label="Roles and permissions table"
      >
        <table className="w-full text-sm">
          <thead className="border-b border-line text-xs text-fg-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 text-left font-medium">
                Permission
              </th>
              {ROLES.map((role) => (
                <th key={role} scope="col" className="px-3 py-2.5 text-center font-medium">
                  {ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {PERMISSION_ROWS.map((row) => (
              <tr key={row.permission}>
                <th scope="row" className="px-5 py-2.5 text-left font-normal text-fg-secondary">
                  {row.label}
                </th>
                {ROLES.map((role) => (
                  <td key={role} className="px-3 py-2.5 text-center">
                    {ROLE_PERMISSIONS[role].includes(row.permission) ? (
                      <Check className="mx-auto size-4 text-brand-fg" aria-label="Allowed" />
                    ) : (
                      <Minus className="mx-auto size-4 text-line-strong" aria-label="Not allowed" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

const changeSchema = z
  .object({
    currentPassword: z.string().min(1, 'Enter your current password'),
    newPassword: passwordSchema,
    confirm: z.string(),
  })
  .refine((v) => v.newPassword === v.confirm, {
    path: ['confirm'],
    message: 'The passwords do not match',
  });
type ChangeValues = z.infer<typeof changeSchema>;

function ChangePasswordForm() {
  const form = useForm<ChangeValues>({
    resolver: zodResolver(changeSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirm: '' },
  });
  const change = useMutation({
    mutationFn: (v: ChangeValues) =>
      api('/auth/password/change', {
        method: 'POST',
        body: { currentPassword: v.currentPassword, newPassword: v.newPassword },
      }),
    onSuccess: () => {
      form.reset();
      toast.success('Password changed. Other devices have been signed out.');
    },
    onError: (e) => {
      if (!applyFieldErrors(e, form.setError))
        toast.error(e instanceof ApiError ? e.message : 'The password was not changed');
    },
  });
  return (
    <form
      noValidate
      className="grid gap-4 sm:max-w-md"
      onSubmit={form.handleSubmit((v) => change.mutate(v))}
    >
      <Field label="Current password" error={form.formState.errors.currentPassword?.message}>
        {(c) => (
          <PasswordInput
            {...c}
            autoComplete="current-password"
            {...form.register('currentPassword')}
          />
        )}
      </Field>
      <Field
        label="New password"
        hint="At least 10 characters, with a letter and a number."
        error={form.formState.errors.newPassword?.message}
      >
        {(c) => (
          <PasswordInput {...c} autoComplete="new-password" {...form.register('newPassword')} />
        )}
      </Field>
      <Field label="Repeat new password" error={form.formState.errors.confirm?.message}>
        {(c) => <PasswordInput {...c} autoComplete="new-password" {...form.register('confirm')} />}
      </Field>
      <div>
        <Button type="submit" loading={change.isPending}>
          Change password
        </Button>
      </div>
    </form>
  );
}

export function SecurityTab() {
  const { signOut } = useAuth();
  const router = useRouter();
  return (
    <Panel>
      <PanelHeader title="Security" />
      <div className="space-y-5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-fg">Sign out of this device</p>
            <p className="text-sm text-fg-muted">Ends this browser session immediately.</p>
          </div>
          <Button
            variant="secondary"
            onClick={async () => {
              await signOut();
              router.replace('/login');
            }}
          >
            Sign out
          </Button>
        </div>
        <div className="border-t border-line pt-5">
          <p className="text-sm font-medium text-fg">Change password</p>
          <p className="mb-4 text-sm text-fg-muted">
            You stay signed in here; every other device is signed out.
          </p>
          <ChangePasswordForm />
        </div>
        <Alert tone="info" title="Two-factor sign-in is not available yet">
          It is planned for a later release. Sessions expire automatically if they are not used for
          a while.
        </Alert>
      </div>
    </Panel>
  );
}
