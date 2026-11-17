'use client';

import { useQuery } from '@tanstack/react-query';
import { type TenantDto } from '@rea/shared-types';
import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/features/auth/auth-provider';
import { formatDeletionDate } from '@/features/settings/data-tab';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

/** Everyone in the business sees this while a deletion is pending; owners can cancel it. */
export function DeletionBanner() {
  const { session } = useAuth();
  const tenant = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: () => api<TenantDto>('/tenants/current'),
    enabled: Boolean(session?.activeTenant),
    staleTime: 60_000,
  });
  const scheduled = tenant.data?.deletionScheduledFor;
  if (!scheduled) return null;
  const isOwner = session?.activeTenant?.role === 'OWNER';
  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 border-b border-danger/20 bg-danger-soft px-4 py-2.5 text-sm text-danger sm:px-6 lg:px-10"
    >
      <p className="flex items-center gap-2">
        <TriangleAlert className="size-4 shrink-0" aria-hidden />
        This business and all its data will be deleted permanently on{' '}
        <strong>{formatDeletionDate(scheduled)}</strong>.
      </p>
      {isOwner && (
        <Link href="/dashboard/settings?tab=data" className="font-semibold underline">
          Cancel deletion
        </Link>
      )}
    </div>
  );
}
