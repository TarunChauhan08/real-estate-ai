'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type InvitationDto, invitableRoles, type InvitationStatus, ROLE_LABELS } from '@rea/shared-types';
import { Mail } from 'lucide-react';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/use-permission';
import { ApiError, api, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';

const STATUS_TONE: Record<InvitationStatus, 'warning' | 'success' | 'neutral' | 'danger'> = {
  PENDING: 'warning',
  ACCEPTED: 'success',
  EXPIRED: 'neutral',
  REVOKED: 'danger',
};
const STATUS_LABEL: Record<InvitationStatus, string> = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  EXPIRED: 'Expired',
  REVOKED: 'Withdrawn',
};

export function InvitationsList() {
  const actorRole = useRole();
  const queryClient = useQueryClient();
  const params = 'pageSize=50';
  const invitations = useQuery({
    queryKey: queryKeys.invitations(params),
    queryFn: () => apiPage<InvitationDto>(`/tenants/current/invitations?${params}`),
  });
  const revoke = useMutation({
    mutationFn: (id: string) => api<InvitationDto>(`/tenants/current/invitations/${id}/revoke`, { method: 'POST' }),
    onSuccess: (inv) => {
      toast.success(`Invitation for ${inv.email} withdrawn`);
      void queryClient.invalidateQueries({ queryKey: ['team'] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Could not withdraw the invitation'),
  });

  return (
    <Panel>
      <PanelHeader title="Invitations" description="People you have invited to join this business" />
      {invitations.isError ? (
        <div className="p-5">
          <ErrorState error={invitations.error} onRetry={() => void invitations.refetch()} />
        </div>
      ) : !invitations.data ? (
        <div className="space-y-3 p-5">
          <Skeleton className="h-10" />
          <Skeleton className="h-10" />
        </div>
      ) : invitations.data.data.length === 0 ? (
        <EmptyState icon={Mail} title="No invitations yet" description="Invite your sales team so they can work leads and site visits with you." />
      ) : (
        <ul className="divide-y divide-subtle">
          {invitations.data.data.map((inv) => (
            <li key={inv.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-fg">{inv.email}</p>
                <p className="text-xs text-fg-muted">
                  {ROLE_LABELS[inv.role]}, invited {formatDate(inv.createdAt)}
                  {inv.invitedBy ? ` by ${inv.invitedBy.name}` : ''}
                  {inv.status === 'PENDING' ? `. Expires ${formatDate(inv.expiresAt)}` : ''}
                </p>
              </div>
              <Badge tone={STATUS_TONE[inv.status]}>{STATUS_LABEL[inv.status]}</Badge>
              {inv.status === 'PENDING' && actorRole && invitableRoles(actorRole).includes(inv.role) && (
                <Button
                  size="sm"
                  variant="ghost"
                  loading={revoke.isPending && revoke.variables === inv.id}
                  onClick={() => revoke.mutate(inv.id)}
                >
                  Withdraw
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
