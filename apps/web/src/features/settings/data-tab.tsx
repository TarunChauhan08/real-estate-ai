'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type BusinessDataExport, type TenantDto } from '@rea/shared-types';
import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { useAuth } from '@/features/auth/auth-provider';
import { api, ApiError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

export const formatDeletionDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

function saveJson(data: unknown, fileName: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }),
  );
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** Owners: take all business data out, or delete the business. */
export function DataTab() {
  const { session } = useAuth();
  const isOwner = session?.activeTenant?.role === 'OWNER';
  const queryClient = useQueryClient();
  const tenant = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: () => api<TenantDto>('/tenants/current'),
  });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const exportData = useMutation({
    mutationFn: () => api<BusinessDataExport>('/tenants/current/data-export'),
    onSuccess: (data) => {
      const slug = session?.activeTenant?.slug ?? 'business';
      saveJson(data, `${slug}-data-${data.exportedAt.slice(0, 10)}.json`);
      toast.success('Your data has been downloaded');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Export failed'),
  });

  const cancel = useMutation({
    mutationFn: () => api<void>('/tenants/current/deletion', { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenant });
      toast.success('Deletion cancelled. Reconnect WhatsApp to let the AI reply to buyers again.');
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'Could not cancel'),
  });

  if (!isOwner) {
    return (
      <Panel className="p-6 text-sm text-fg-muted">
        Only an owner of this business can export or delete its data.
      </Panel>
    );
  }
  const scheduled = tenant.data?.deletionScheduledFor ?? null;

  return (
    <div className="space-y-6">
      <Panel>
        <PanelHeader
          title="Export your data"
          description="Everything your business has stored: profile, team, listings, leads, conversations, site visits and recent activity."
        />
        <div className="flex flex-wrap items-center justify-between gap-3 p-5">
          <p className="text-sm text-fg-muted">
            One JSON file you can keep, open in any tool or import elsewhere. Passwords and access
            tokens are never included.
          </p>
          <Button
            variant="secondary"
            loading={exportData.isPending}
            onClick={() => exportData.mutate()}
          >
            <Download /> Download all data
          </Button>
        </div>
      </Panel>

      <Panel aria-label="Delete business">
        <PanelHeader title="Delete this business" />
        <div className="space-y-4 p-5">
          {scheduled ? (
            <>
              <Alert
                tone="danger"
                title={`Scheduled for deletion on ${formatDeletionDate(scheduled)}`}
              >
                After that date the business and all its data are deleted permanently. WhatsApp was
                disconnected, so the AI is no longer replying to buyers.
              </Alert>
              <Button
                variant="secondary"
                loading={cancel.isPending}
                onClick={() => cancel.mutate()}
              >
                Cancel deletion
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-fg-muted">
                Your WhatsApp number is disconnected straight away. After 30 days the business, its
                listings, leads, conversations and team access are deleted permanently. You can
                cancel any time before then. Download your data first if you want a copy.
              </p>
              <Button variant="danger" onClick={() => setDeleteOpen(true)}>
                <Trash2 /> Delete business…
              </Button>
            </>
          )}
        </div>
      </Panel>

      {tenant.data && (
        <DeleteBusinessDialog
          businessName={tenant.data.name}
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
        />
      )}
    </div>
  );
}

function DeleteBusinessDialog({
  businessName,
  open,
  onOpenChange,
}: {
  businessName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const close = (next: boolean) => {
    onOpenChange(next);
    if (!next) {
      setName('');
      setPassword('');
      setErrors({});
    }
  };
  const remove = useMutation({
    mutationFn: () =>
      api<Pick<TenantDto, 'deletionScheduledFor'>>('/tenants/current/deletion', {
        method: 'POST',
        body: { password, confirmBusinessName: name },
      }),
    onSuccess: (r) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tenant });
      void queryClient.invalidateQueries({ queryKey: ['channels'] });
      toast.success(`Deletion scheduled for ${formatDeletionDate(r.deletionScheduledFor!)}`);
      close(false);
    },
    onError: (e) => {
      if (e instanceof ApiError && e.details?.length) {
        setErrors(Object.fromEntries(e.details.map((d) => [d.field, d.message])));
      } else setErrors({ form: e instanceof ApiError ? e.message : 'Something went wrong' });
    },
  });

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent
        title="Delete this business?"
        description="This disconnects WhatsApp now and deletes everything permanently after 30 days."
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setErrors({});
            remove.mutate();
          }}
        >
          {errors.form && <Alert tone="danger">{errors.form}</Alert>}
          <Field label={`Type “${businessName}” to confirm`} error={errors.confirmBusinessName}>
            {(c) => (
              <Input
                {...c}
                value={name}
                autoComplete="off"
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
          <Field label="Your password" error={errors.password}>
            {(c) => (
              <Input
                {...c}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            )}
          </Field>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button type="button" variant="secondary" onClick={() => close(false)}>
              Keep my business
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={remove.isPending}
              disabled={name.trim() !== businessName || password.length === 0}
            >
              Schedule deletion
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
