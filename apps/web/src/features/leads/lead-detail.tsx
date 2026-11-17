'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  canTransitionLeadStatus,
  CONVERSATION_CHANNEL_LABELS,
  type ConversationDto,
  type ConversationSummaryDto,
  LEAD_SOURCE_LABELS,
  LEAD_STATUS_LABELS,
  type LeadDto,
  LeadStatus,
  type MemberDto,
  Permission,
  PURCHASE_TIMELINE_LABELS,
} from '@rea/shared-types';
import { ArrowLeft, MessagesSquare, Pencil, Phone } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/states/states';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { formatDate, formatDateTime } from '@/lib/utils';
import { formatBudget } from './format';
import { LeadStatusBadge, TemperatureBadge } from './lead-badges';
import { LeadFormDialog } from './lead-form-dialog';

const LANGUAGE: Record<string, string> = { en: 'English', hi: 'Hindi', hinglish: 'Hinglish' };

/** Read-only view of what is known about a buyer — the same facts the AI works from. */
export function LeadFacts({ lead }: { lead: LeadDto }) {
  const facts: Array<[string, string | null]> = [
    ['Budget', formatBudget(lead.budgetMin, lead.budgetMax)],
    ['City', lead.preferredCity],
    ['Localities', lead.preferredLocalities.join(', ') || null],
    ['BHK', lead.preferredBedrooms.length ? lead.preferredBedrooms.join(' or ') : null],
    [
      'Purpose',
      lead.purpose === 'SELF_USE'
        ? 'Self use'
        : lead.purpose === 'INVESTMENT'
          ? 'Investment'
          : null,
    ],
    ['Timeline', lead.timeline ? PURCHASE_TIMELINE_LABELS[lead.timeline] : null],
    [
      'Home loan',
      lead.needsHomeLoan === null ? null : lead.needsHomeLoan ? 'Needs a loan' : 'No loan needed',
    ],
    [
      'Language',
      lead.preferredLanguage ? (LANGUAGE[lead.preferredLanguage] ?? lead.preferredLanguage) : null,
    ],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs text-fg-muted">{label}</dt>
          <dd
            className={
              value ? 'mt-0.5 text-sm font-medium text-fg' : 'mt-0.5 text-sm text-fg-faint'
            }
          >
            {value ?? 'Not known yet'}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function LeadDetail({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const canWrite = usePermission(Permission.LEADS_WRITE);
  const canAssign = usePermission(Permission.LEADS_ASSIGN);
  const canChat = usePermission(Permission.CONVERSATIONS_WRITE);
  const [editing, setEditing] = useState(false);

  const lead = useQuery({
    queryKey: queryKeys.lead(id),
    queryFn: () => api<LeadDto>(`/leads/${id}`),
  });
  const conversations = useQuery({
    queryKey: queryKeys.conversations(`leadId=${id}`),
    queryFn: () => apiPage<ConversationSummaryDto>(`/conversations?leadId=${id}&pageSize=20`),
  });
  const members = useQuery({
    queryKey: queryKeys.activeMembers,
    queryFn: () => apiPage<MemberDto>('/tenants/current/members?status=ACTIVE&pageSize=100'),
    enabled: canAssign,
  });

  const onSaved = (saved: LeadDto, message: string) => {
    queryClient.setQueryData(queryKeys.lead(id), saved);
    void queryClient.invalidateQueries({ queryKey: ['leads', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    toast.success(message);
  };
  const onError = (error: unknown) =>
    toast.error(error instanceof ApiError ? error.message : 'The change was not saved');

  const status = useMutation({
    mutationFn: (next: LeadStatus) =>
      api<LeadDto>(`/leads/${id}/status`, { method: 'PATCH', body: { status: next } }),
    onSuccess: (saved) => onSaved(saved, `Moved to ${LEAD_STATUS_LABELS[saved.status]}`),
    onError,
  });
  const assign = useMutation({
    mutationFn: (membershipId: string | null) =>
      api<LeadDto>(`/leads/${id}/assignee`, { method: 'PATCH', body: { membershipId } }),
    onSuccess: (saved) =>
      onSaved(saved, saved.assignedTo ? `Assigned to ${saved.assignedTo.name}` : 'Unassigned'),
    onError,
  });
  const chat = useMutation({
    mutationFn: () =>
      api<ConversationDto>('/conversations', { method: 'POST', body: { leadId: id } }),
    onSuccess: (conversation) => router.push(`/dashboard/conversations?id=${conversation.id}`),
    onError,
  });

  if (lead.isError) return <ErrorState error={lead.error} onRetry={() => void lead.refetch()} />;
  if (!lead.data)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  const l = lead.data;

  return (
    <>
      <Link
        href="/dashboard/leads"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-fg"
      >
        <ArrowLeft className="size-4" /> All leads
      </Link>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-fg">{l.name}</h1>
            <TemperatureBadge value={l.temperature} />
            <LeadStatusBadge value={l.status} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
            <a
              href={`tel:${l.phone}`}
              className="inline-flex items-center gap-1 tabular-nums hover:text-brand-fg"
            >
              <Phone className="size-3.5" /> {l.phone}
            </a>
            {l.email && <span>{l.email}</span>}
            <span>
              {LEAD_SOURCE_LABELS[l.source]} · added {formatDate(l.createdAt)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          {canWrite && (
            <Button variant="secondary" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
          )}
          {canChat && canWrite && (
            <Button onClick={() => chat.mutate()} loading={chat.isPending}>
              <MessagesSquare /> Chat as this buyer
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-6">
          <Panel>
            <PanelHeader
              title="What we know"
              description="Filled in by your team and by the AI from conversations"
            />
            <div className="p-5">
              <LeadFacts lead={l} />
              {l.notes && (
                <div className="mt-5 rounded-lg bg-canvas p-4 text-sm leading-relaxed text-fg-secondary">
                  {l.notes}
                </div>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Conversations" />
            {conversations.data?.data.length ? (
              <ul className="divide-y divide-subtle">
                {conversations.data.data.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/dashboard/conversations?id=${c.id}`}
                      className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-canvas"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-fg">
                          {CONVERSATION_CHANNEL_LABELS[c.channel]}
                        </p>
                        <p className="truncate text-xs text-fg-muted">
                          {c.lastMessage?.content ?? 'No messages yet'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-fg-muted">
                        {c.lastMessageAt
                          ? formatDateTime(c.lastMessageAt)
                          : formatDateTime(c.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-6 text-sm text-fg-muted">
                {conversations.isLoading ? 'Loading…' : 'No conversations with this buyer yet.'}
              </p>
            )}
          </Panel>
        </div>

        <Panel className="h-fit">
          <PanelHeader title="Pipeline" />
          <div className="space-y-5 p-5">
            <div className="space-y-1.5">
              <label htmlFor="lead-stage" className="text-sm font-medium text-fg-secondary">
                Stage
              </label>
              <Select
                id="lead-stage"
                value={l.status}
                disabled={!canWrite || status.isPending}
                onChange={(e) => status.mutate(e.target.value as LeadStatus)}
              >
                {Object.values(LeadStatus).map((s) => (
                  <option key={s} value={s} disabled={!canTransitionLeadStatus(l.status, s)}>
                    {LEAD_STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              {l.status === 'WON' && <p className="text-xs text-fg-muted">Won is final.</p>}
              {l.status === 'LOST' && (
                <p className="text-xs text-fg-muted">A lost lead can be re-opened as New.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="lead-assignee" className="text-sm font-medium text-fg-secondary">
                Assigned to
              </label>
              {canAssign ? (
                <Select
                  id="lead-assignee"
                  value={l.assignedTo?.id ?? ''}
                  disabled={assign.isPending || !members.data}
                  onChange={(e) => assign.mutate(e.target.value || null)}
                >
                  <option value="">Unassigned</option>
                  {members.data?.data.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                  {l.assignedTo && !members.data?.data.some((m) => m.id === l.assignedTo!.id) && (
                    <option value={l.assignedTo.id}>{l.assignedTo.name}</option>
                  )}
                </Select>
              ) : (
                <p className="text-sm text-fg">{l.assignedTo?.name ?? 'Unassigned'}</p>
              )}
            </div>
            <div className="border-t border-line pt-4 text-xs text-fg-muted">
              Last contacted: {l.lastContactedAt ? formatDateTime(l.lastContactedAt) : 'never'}
            </div>
          </div>
        </Panel>
      </div>

      {canWrite && (
        <LeadFormDialog
          lead={l}
          open={editing}
          onOpenChange={setEditing}
          onSaved={(saved) => queryClient.setQueryData(queryKeys.lead(id), saved)}
        />
      )}
    </>
  );
}
