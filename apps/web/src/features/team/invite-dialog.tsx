'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { type CreateInvitationResponse, invitableRoles, type MembershipRole, ROLE_LABELS } from '@rea/shared-types';
import { Copy, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { api, ApiError, applyFieldErrors } from '@/lib/api-client';
import { formatDateTime } from '@/lib/utils';

const schema = z.object({
  email: z.string().trim().min(1, 'Enter an email').email('Enter a valid email address'),
  role: z.string().min(1, 'Choose a role'),
});
type Values = z.infer<typeof schema>;

export function InviteDialog({ actorRole }: { actorRole: MembershipRole }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<CreateInvitationResponse | null>(null);
  const queryClient = useQueryClient();
  const roles = invitableRoles(actorRole);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', role: roles.at(-2) ?? roles[0] } });

  const mutation = useMutation({
    mutationFn: (values: Values) =>
      api<CreateInvitationResponse>('/tenants/current/invitations', { method: 'POST', body: values }),
    onSuccess: (data) => {
      setResult(data);
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) => {
      if (!applyFieldErrors(error, form.setError)) {
        form.setError('root', { message: error instanceof ApiError ? error.message : 'Could not create the invitation' });
      }
    },
  });

  const close = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setResult(null);
      form.reset();
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Invitation link copied');
    } catch {
      toast.error('Copy failed — select the link and copy it manually');
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus /> Invite member
        </Button>
      </DialogTrigger>
      <DialogContent
        title={result ? 'Invitation created' : 'Invite a team member'}
        description={result ? undefined : 'They will join your business with the role you choose.'}
      >
        {result ? (
          <div className="space-y-4">
            <Alert tone="warning" title="No email was sent">
              {result.delivery.reason}
            </Alert>
            {result.delivery.devAcceptUrl ? (
              <div className="space-y-2">
                <p className="text-sm text-fg-secondary">
                  Send this link to <strong>{result.invitation.email}</strong>. It works once and expires on{' '}
                  {formatDateTime(result.invitation.expiresAt)}.
                </p>
                <div className="flex gap-2">
                  <Input readOnly value={result.delivery.devAcceptUrl} aria-label="Invitation link" onFocus={(e) => e.currentTarget.select()} />
                  <Button variant="secondary" size="icon" aria-label="Copy invitation link" onClick={() => void copy(result.delivery.devAcceptUrl!)}>
                    <Copy />
                  </Button>
                </div>
                <p className="text-xs text-fg-muted">This link is shown only now and only in development environments.</p>
              </div>
            ) : (
              <p className="text-sm text-fg-secondary">
                The invitation for {result.invitation.email} is pending. Email delivery will be enabled in a later release.
              </p>
            )}
            <div className="flex justify-end">
              <Button variant="secondary" onClick={() => close(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit((values) => mutation.mutate(values))} noValidate className="space-y-4">
            {form.formState.errors.root && <Alert tone="danger">{form.formState.errors.root.message}</Alert>}
            <Field label="Email" error={form.formState.errors.email?.message}>
              {(c) => <Input {...c} type="email" autoFocus {...form.register('email')} />}
            </Field>
            <Field label="Role" error={form.formState.errors.role?.message} hint="You can only invite roles below your own.">
              {(c) => (
                <Select {...c} {...form.register('role')}>
                  {roles.map((role) => (
                    <option key={role} value={role}>
                      {ROLE_LABELS[role]}
                    </option>
                  ))}
                </Select>
              )}
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Create invitation
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
