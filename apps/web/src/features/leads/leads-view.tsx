'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  LEAD_TEMPERATURE_LABELS,
  type LeadDto,
  LeadStatus,
  LeadTemperature,
  Permission,
} from '@rea/shared-types';
import { ChevronRight, Plus, UserRoundSearch } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Button } from '@/components/ui/button';
import { Input, Select } from '@/components/ui/input';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDate } from '@/lib/utils';
import { formatBudget } from './format';
import { LeadStatusBadge, TemperatureBadge } from './lead-badges';
import { LeadFormDialog } from './lead-form-dialog';

const PAGE_SIZE = 20;

export function LeadsView() {
  const router = useRouter();
  const canWrite = usePermission(Permission.LEADS_WRITE);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [temperature, setTemperature] = useState('');
  const [page, setPage] = useState(1);
  const [creating, setCreating] = useState(false);

  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(search ? { q: search } : {}),
    ...(status ? { status } : {}),
    ...(temperature ? { temperature } : {}),
  }).toString();
  const leads = useQuery({
    queryKey: queryKeys.leads(params),
    queryFn: () => apiPage<LeadDto>(`/leads?${params}`),
    placeholderData: keepPreviousData,
  });
  const filtered = Boolean(search || status || temperature);

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every buyer in one pipeline. Leads from AI chats fill themselves in as the conversation goes."
        actions={
          canWrite ? (
            <Button onClick={() => setCreating(true)}>
              <Plus /> Add lead
            </Button>
          ) : undefined
        }
      />

      <Panel>
        <div className="flex flex-wrap items-center gap-3 border-b border-line p-4">
          <Input
            type="search"
            placeholder="Search name, phone or email"
            aria-label="Search leads"
            className="h-9 min-w-56 flex-1"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
          <Select
            aria-label="Stage"
            className="h-9 w-48"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All stages</option>
            {Object.values(LeadStatus).map((s) => (
              <option key={s} value={s}>
                {LEAD_STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
          <Select
            aria-label="Score"
            className="h-9 w-40"
            value={temperature}
            onChange={(e) => {
              setTemperature(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All scores</option>
            {Object.values(LeadTemperature).map((t) => (
              <option key={t} value={t}>
                {LEAD_TEMPERATURE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>

        {leads.isError ? (
          <div className="p-5">
            <ErrorState error={leads.error} onRetry={() => void leads.refetch()} />
          </div>
        ) : !leads.data ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="h-11" />
            ))}
          </div>
        ) : leads.data.data.length === 0 ? (
          <EmptyState
            icon={UserRoundSearch}
            title={filtered ? 'No leads match' : 'No leads yet'}
            description={
              filtered
                ? 'Try a different search or filter.'
                : 'Add a buyer yourself, or start a test chat with your AI employee — it creates the lead for you.'
            }
            action={
              !filtered && canWrite ? (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button onClick={() => setCreating(true)}>
                    <Plus /> Add lead
                  </Button>
                  <Button asChild variant="secondary">
                    <Link href="/dashboard/ai-employee">Start a test chat</Link>
                  </Button>
                </div>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Leads table">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-canvas text-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Buyer
                  </th>
                  <th scope="col" className="hidden px-5 py-2.5 font-medium md:table-cell">
                    Looking for
                  </th>
                  <th scope="col" className="hidden px-5 py-2.5 font-medium lg:table-cell">
                    Budget
                  </th>
                  <th scope="col" className="px-5 py-2.5 font-medium">
                    Score
                  </th>
                  <th scope="col" className="hidden px-5 py-2.5 font-medium sm:table-cell">
                    Stage
                  </th>
                  <th scope="col" className="hidden px-5 py-2.5 font-medium xl:table-cell">
                    Assigned to
                  </th>
                  <th scope="col" className="px-5 py-2.5">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-subtle">
                {leads.data.data.map((lead) => {
                  const need = [
                    lead.preferredBedrooms.length
                      ? `${lead.preferredBedrooms.join('/')} BHK`
                      : null,
                    lead.preferredLocalities[0] ?? lead.preferredCity,
                  ]
                    .filter(Boolean)
                    .join(' · ');
                  return (
                    <tr
                      key={lead.id}
                      className="cursor-pointer transition-colors hover:bg-canvas"
                      onClick={() => router.push(`/dashboard/leads/${lead.id}`)}
                    >
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="font-medium text-fg hover:text-brand-fg"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {lead.name}
                        </Link>
                        <p className="text-xs tabular-nums text-fg-muted">
                          {lead.phone} · {LEAD_SOURCE_LABELS[lead.source]} ·{' '}
                          {formatDate(lead.createdAt)}
                        </p>
                      </td>
                      <td className="hidden px-5 py-3 text-fg-secondary md:table-cell">
                        {need || '—'}
                      </td>
                      <td className="hidden px-5 py-3 tabular-nums text-fg-secondary lg:table-cell">
                        {formatBudget(lead.budgetMin, lead.budgetMax) ?? '—'}
                      </td>
                      <td className="px-5 py-3">
                        <TemperatureBadge value={lead.temperature} />
                      </td>
                      <td className="hidden px-5 py-3 sm:table-cell">
                        <LeadStatusBadge value={lead.status} />
                      </td>
                      <td className="hidden px-5 py-3 text-fg-secondary xl:table-cell">
                        {lead.assignedTo?.name ?? <span className="text-fg-muted">Unassigned</span>}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <ChevronRight className="ml-auto size-4 text-fg-faint" aria-hidden />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {leads.data && leads.data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-fg-muted">
            <span>
              Page {leads.data.meta.page} of {leads.data.meta.totalPages} · {leads.data.meta.total}{' '}
              leads
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={page >= leads.data.meta.totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Panel>

      {canWrite && (
        <LeadFormDialog
          open={creating}
          onOpenChange={setCreating}
          onSaved={(lead) => router.push(`/dashboard/leads/${lead.id}`)}
        />
      )}
    </>
  );
}
