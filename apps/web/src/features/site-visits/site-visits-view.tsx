'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Permission,
  SITE_VISIT_STATUS_LABELS,
  type SiteVisitDto,
  type SiteVisitResultDto,
  type SiteVisitScope,
  type SiteVisitStatus,
} from '@rea/shared-types';
import {
  CalendarCheck,
  CalendarClock,
  Home,
  MapPin,
  MessagesSquare,
  Phone,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDateTime } from '@/lib/utils';
import { announce, VisitDialog, type VisitDialogMode } from './visit-dialog';

const SCOPES: Array<{ value: SiteVisitScope; label: string; empty: string }> = [
  {
    value: 'requested',
    label: 'Needs confirmation',
    empty:
      'No visit requests waiting. When a buyer asks to visit, it appears here for you to confirm.',
  },
  { value: 'upcoming', label: 'Upcoming', empty: 'No confirmed visits coming up.' },
  { value: 'past', label: 'Past', empty: 'Completed, cancelled and missed visits will show here.' },
];

const STATUS_TONE: Record<SiteVisitStatus, 'neutral' | 'ink' | 'success' | 'warning' | 'danger'> = {
  REQUESTED: 'warning',
  CONFIRMED: 'ink',
  COMPLETED: 'success',
  CANCELLED: 'neutral',
  NO_SHOW: 'danger',
};

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});
const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

export function SiteVisitStatusBadge({ status }: { status: SiteVisitStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{SITE_VISIT_STATUS_LABELS[status]}</Badge>;
}

function useVisitAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SiteVisitStatus }) =>
      api<SiteVisitResultDto>(`/site-visits/${id}`, { method: 'PATCH', body: { status } }),
    onSuccess: (result, { status }) => {
      void queryClient.invalidateQueries({ queryKey: ['site-visits'] });
      void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      announce(result.notification, `Marked ${SITE_VISIT_STATUS_LABELS[status].toLowerCase()}`);
    },
    onError: (e) => toast.error(e instanceof ApiError ? e.message : 'The change was not saved'),
  });
}

/** One visit: who, where, when, and the next sensible actions. */
export function VisitCard({
  visit,
  onEdit,
}: {
  visit: SiteVisitDto;
  onEdit: (mode: VisitDialogMode) => void;
}) {
  const canWrite = usePermission(Permission.SITE_VISITS_WRITE);
  const action = useVisitAction();
  const passed = visit.scheduledAt !== null && new Date(visit.scheduledAt).getTime() < Date.now();
  const busy = action.isPending;
  const act = (status: SiteVisitStatus) => action.mutate({ id: visit.id, status });

  return (
    <li className="rounded-[var(--radius-panel)] border border-line bg-white p-5 shadow-[var(--shadow-soft)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/dashboard/leads/${visit.lead.id}`}
              className="font-semibold text-fg hover:text-brand-fg"
            >
              {visit.lead.name}
            </Link>
            <SiteVisitStatusBadge status={visit.status} />
          </div>
          <a
            href={`tel:${visit.lead.phone}`}
            className="mt-0.5 inline-flex items-center gap-1 text-sm tabular-nums text-fg-muted hover:text-brand-fg"
          >
            <Phone className="size-3.5" aria-hidden /> {visit.lead.phone}
          </a>
        </div>
        <div className="text-right">
          {visit.scheduledAt ? (
            <>
              <p className="font-semibold text-fg">
                {timeFormat.format(new Date(visit.scheduledAt))}
              </p>
              <p className="text-xs text-fg-muted">
                {dayFormat.format(new Date(visit.scheduledAt))}
              </p>
            </>
          ) : (
            <p className="text-sm text-fg-muted">
              Asked for:{' '}
              <span className="font-semibold text-fg">
                {visit.requestedSlot ?? 'no time given'}
              </span>
            </p>
          )}
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="flex items-center gap-2">
          <dt className="sr-only">Property</dt>
          <Home className="size-4 shrink-0 text-gold-deep" aria-hidden />
          <dd className="truncate text-fg-secondary">
            {visit.property ? (
              <>
                {visit.property.title}
                {visit.property.locality && (
                  <span className="text-fg-muted"> · {visit.property.locality}</span>
                )}
              </>
            ) : (
              <span className="text-fg-muted">Property not chosen yet</span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-2">
          <dt className="sr-only">Shown by</dt>
          <UserRound className="size-4 shrink-0 text-gold-deep" aria-hidden />
          <dd className="text-fg-secondary">
            {visit.assignedTo?.name ?? <span className="text-fg-muted">Not assigned</span>}
          </dd>
        </div>
        {visit.notes && (
          <div className="flex items-start gap-2 sm:col-span-2">
            <dt className="sr-only">Notes</dt>
            <MapPin className="mt-0.5 size-4 shrink-0 text-gold-deep" aria-hidden />
            <dd className="text-fg-secondary">{visit.notes}</dd>
          </div>
        )}
      </dl>

      {visit.reminderSentAt && visit.status === 'CONFIRMED' && (
        <p className="mt-3 text-xs text-fg-muted">
          Reminder sent {formatDateTime(visit.reminderSentAt)}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
        {visit.conversationId && (
          <Button asChild variant="ghost" size="sm">
            <Link href={`/dashboard/conversations?id=${visit.conversationId}`}>
              <MessagesSquare /> Chat
            </Link>
          </Button>
        )}
        {canWrite && visit.status === 'REQUESTED' && (
          <>
            <Button size="sm" onClick={() => onEdit({ kind: 'confirm', visit })}>
              <CalendarCheck /> Confirm a time
            </Button>
            <Button size="sm" variant="ghost" loading={busy} onClick={() => act('CANCELLED')}>
              Decline
            </Button>
          </>
        )}
        {canWrite && visit.status === 'CONFIRMED' && (
          <>
            {passed ? (
              <>
                <Button size="sm" loading={busy} onClick={() => act('COMPLETED')}>
                  Visit done
                </Button>
                <Button size="sm" variant="secondary" loading={busy} onClick={() => act('NO_SHOW')}>
                  Didn’t come
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => onEdit({ kind: 'reschedule', visit })}
              >
                <CalendarClock /> Reschedule
              </Button>
            )}
            <Button size="sm" variant="ghost" loading={busy} onClick={() => act('CANCELLED')}>
              Cancel visit
            </Button>
          </>
        )}
        {canWrite && visit.status === 'COMPLETED' && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => act('NO_SHOW')}>
            Correct to no-show
          </Button>
        )}
        {canWrite && visit.status === 'NO_SHOW' && (
          <Button size="sm" variant="ghost" loading={busy} onClick={() => act('COMPLETED')}>
            Correct to completed
          </Button>
        )}
      </div>
    </li>
  );
}

function VisitList({
  scope,
  empty,
  onEdit,
}: {
  scope: SiteVisitScope;
  empty: string;
  onEdit: (mode: VisitDialogMode) => void;
}) {
  const visits = useQuery({
    queryKey: queryKeys.siteVisits(`scope=${scope}`),
    queryFn: () => apiPage<SiteVisitDto>(`/site-visits?scope=${scope}&pageSize=100`),
    refetchInterval: 30_000,
  });
  if (visits.isError)
    return <ErrorState error={visits.error} onRetry={() => void visits.refetch()} />;
  if (!visits.data)
    return (
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
    );
  if (visits.data.data.length === 0)
    return <EmptyState icon={CalendarCheck} title="Nothing here" description={empty} />;
  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {visits.data.data.map((v) => (
        <VisitCard key={v.id} visit={v} onEdit={onEdit} />
      ))}
    </ul>
  );
}

export function SiteVisitsView() {
  const [dialog, setDialog] = useState<VisitDialogMode | null>(null);
  const requested = useQuery({
    queryKey: queryKeys.siteVisits('scope=requested'),
    queryFn: () => apiPage<SiteVisitDto>('/site-visits?scope=requested&pageSize=100'),
  });
  const waiting = requested.data?.meta.total ?? 0;

  return (
    <>
      <Tabs defaultValue={waiting > 0 || requested.isLoading ? 'requested' : 'upcoming'}>
        <TabsList aria-label="Site visits">
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value}>
              {s.label}
              {s.value === 'requested' && waiting > 0 && (
                <span className="ml-2 rounded-full bg-attention-soft px-2 py-0.5 text-xs font-bold text-attention-fg">
                  {waiting}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {SCOPES.map((s) => (
          <TabsContent key={s.value} value={s.value}>
            <VisitList scope={s.value} empty={s.empty} onEdit={setDialog} />
          </TabsContent>
        ))}
      </Tabs>
      <VisitDialog mode={dialog} onOpenChange={(open) => !open && setDialog(null)} />
    </>
  );
}
