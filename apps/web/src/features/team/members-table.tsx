'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  canAssignRole,
  canManageRole,
  type MemberDto,
  MembershipRole,
  Permission,
  ROLE_LABELS,
} from '@rea/shared-types';
import { Users } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission, useRole } from '@/hooks/use-permission';
import { ApiError, api, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';

const PAGE_SIZE = 20;

function useMemberMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, path, body }: { id: string; path: 'role' | 'status'; body: object }) =>
      api<MemberDto>(`/tenants/current/members/${id}/${path}`, { method: 'PATCH', body }),
    onSuccess: (member, { path }) => {
      toast.success(
        path === 'role'
          ? `${member.name} is now ${ROLE_LABELS[member.role]}`
          : `${member.name} is ${member.status === 'ACTIVE' ? 'active' : 'suspended'}`,
      );
      void queryClient.invalidateQueries({ queryKey: ['team'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error) =>
      toast.error(error instanceof ApiError ? error.message : 'The change was not saved'),
  });
}

export function MembersTable() {
  const actorRole = useRole();
  const canManage = usePermission(Permission.MEMBERS_MANAGE);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(search ? { q: search } : {}),
  }).toString();
  const members = useQuery({
    queryKey: queryKeys.members(params),
    queryFn: () => apiPage<MemberDto>(`/tenants/current/members?${params}`),
  });
  const mutation = useMemberMutation();

  return (
    <Panel>
      <PanelHeader
        title="Members"
        description={
          members.data
            ? `${members.data.meta.total} ${members.data.meta.total === 1 ? 'person' : 'people'} in this business`
            : undefined
        }
        actions={
          <Input
            type="search"
            placeholder="Search name or email"
            aria-label="Search members"
            className="h-9 w-full sm:w-56"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        }
      />
      {members.isError ? (
        <div className="p-5">
          <ErrorState error={members.error} onRetry={() => void members.refetch()} />
        </div>
      ) : !members.data ? (
        <div className="space-y-3 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      ) : members.data.data.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No members match"
          description="Try a different name or email."
        />
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Members table">
          <table className="w-full text-left text-sm tabular-nums">
            <thead className="border-b border-line text-xs text-fg-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  Name
                </th>
                <th scope="col" className="hidden px-5 py-2.5 font-medium sm:table-cell">
                  Role
                </th>
                <th scope="col" className="hidden px-5 py-2.5 font-medium sm:table-cell">
                  Status
                </th>
                <th scope="col" className="hidden px-5 py-2.5 font-medium md:table-cell">
                  Joined
                </th>
                <th scope="col" className="px-5 py-2.5 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-subtle">
              {members.data.data.map((member) => {
                const manageable = Boolean(
                  actorRole &&
                  canManage &&
                  !member.isCurrentUser &&
                  canManageRole(actorRole, member.role),
                );
                const roleOptions = Object.values(MembershipRole).filter(
                  (role) => role === member.role || (actorRole && canAssignRole(actorRole, role)),
                );
                const busy = mutation.isPending && mutation.variables?.id === member.id;
                const roleControl = manageable ? (
                  <Select
                    aria-label={`Role for ${member.name}`}
                    className="h-8 w-40"
                    value={member.role}
                    disabled={busy}
                    onChange={(e) =>
                      mutation.mutate({
                        id: member.id,
                        path: 'role',
                        body: { role: e.target.value },
                      })
                    }
                  >
                    {roleOptions.map((role) => (
                      <option key={role} value={role}>
                        {ROLE_LABELS[role]}
                      </option>
                    ))}
                  </Select>
                ) : (
                  <span className="text-fg-secondary">{ROLE_LABELS[member.role]}</span>
                );
                const statusBadge = (
                  <Badge
                    tone={
                      member.status === 'ACTIVE'
                        ? 'success'
                        : member.status === 'SUSPENDED'
                          ? 'danger'
                          : 'neutral'
                    }
                  >
                    {member.status === 'ACTIVE'
                      ? 'Active'
                      : member.status === 'SUSPENDED'
                        ? 'Disabled'
                        : 'Invited'}
                  </Badge>
                );
                return (
                  <tr key={member.id}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-fg">
                        {member.name}
                        {member.isCurrentUser && (
                          <span className="ml-1.5 text-xs font-normal text-fg-muted">(you)</span>
                        )}
                      </p>
                      <p className="text-xs text-fg-muted">{member.email}</p>
                      {/* Small screens: role and status stack under the name instead of extra columns. */}
                      <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                        {roleControl}
                        {statusBadge}
                      </div>
                    </td>
                    <td className="hidden px-5 py-3 sm:table-cell">{roleControl}</td>
                    <td className="hidden px-5 py-3 sm:table-cell">{statusBadge}</td>
                    <td className="hidden px-5 py-3 text-fg-muted md:table-cell">
                      {formatDate(member.joinedAt)}
                    </td>
                    <td className="px-5 py-3 text-right align-top sm:align-middle">
                      {manageable && (
                        <Button
                          size="sm"
                          variant={member.status === 'ACTIVE' ? 'ghost' : 'secondary'}
                          loading={busy}
                          onClick={() =>
                            mutation.mutate({
                              id: member.id,
                              path: 'status',
                              body: { status: member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' },
                            })
                          }
                        >
                          {member.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {members.data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-fg-muted">
              <span>
                Page {members.data.meta.page} of {members.data.meta.totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={page >= members.data.meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Panel>
  );
}
