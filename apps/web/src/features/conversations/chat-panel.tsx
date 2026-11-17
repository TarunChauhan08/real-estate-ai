'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CONVERSATION_CHANNEL_LABELS,
  type ConversationDto,
  type ConversationTurnDto,
  formatInr,
  type LeadDto,
  type MessageDto,
  Permission,
  type PropertyDto,
  type SiteVisitDto,
} from '@rea/shared-types';
import {
  Bot,
  CalendarCheck,
  Building2,
  Check,
  CheckCheck,
  Clock3,
  Lock,
  MessageCircle,
  SendHorizonal,
  TriangleAlert,
  UserRound,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LeadFacts } from '@/features/leads/lead-detail';
import { LeadStatusBadge, TemperatureBadge } from '@/features/leads/lead-badges';
import { VisitDialog, type VisitDialogMode } from '@/features/site-visits/visit-dialog';
import { usePermission } from '@/hooks/use-permission';
import { api, ApiError, apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const SAMPLE_MESSAGES = [
  'Hi, mujhe Noida mein 3 BHK chahiye. Budget 85 lakh hai.',
  'Looking for a ready-to-move 2 BHK under 70 lakh, need a home loan.',
  'मुझे सेक्टर 150 में फ्लैट देखना है, इस शनिवार विज़िट हो सकती है?',
  'Can you give me a discount on the Sector 150 flat?',
];

const timeFormat = new Intl.DateTimeFormat('en-IN', { hour: 'numeric', minute: '2-digit' });

/** WhatsApp-style ticks for outgoing messages. */
function DeliveryTicks({ message }: { message: MessageDto }) {
  switch (message.deliveryStatus) {
    case 'PENDING':
      return <Clock3 className="size-3" aria-label="Sending" />;
    case 'SENT':
      return <Check className="size-3.5" aria-label="Sent" />;
    case 'DELIVERED':
      return <CheckCheck className="size-3.5" aria-label="Delivered" />;
    case 'READ':
      return <CheckCheck className="size-3.5 text-sky-600" aria-label="Read" />;
    case 'FAILED':
      return <TriangleAlert className="size-3.5 text-danger" aria-label="Not delivered" />;
    default:
      return null;
  }
}

function hoursLeft(iso: string | null): number | null {
  if (!iso) return null;
  return Math.max(0, (new Date(iso).getTime() - Date.now()) / 3_600_000);
}

function Message({
  message,
  properties,
}: {
  message: MessageDto;
  properties: Map<string, PropertyDto>;
}) {
  if (message.role === 'SYSTEM') {
    return (
      <li className="flex justify-center">
        <p className="rounded-full bg-attention-soft px-3 py-1 text-xs font-medium text-attention-fg">
          {message.content}
        </p>
      </li>
    );
  }
  const buyer = message.role === 'BUYER';
  const suggested = message.suggestedPropertyIds
    .map((id) => properties.get(id))
    .filter(Boolean) as PropertyDto[];
  return (
    <li className={cn('flex gap-2.5', buyer && 'flex-row-reverse')}>
      <span
        className={cn(
          'mt-1 flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold',
          buyer
            ? 'bg-subtle text-fg-secondary'
            : message.role === 'AI'
              ? 'bg-gold text-brand-deep'
              : 'bg-brand-soft-2 text-brand-fg',
        )}
        aria-hidden
      >
        {buyer ? (
          <UserRound className="size-3.5" />
        ) : message.role === 'AI' ? (
          <Bot className="size-3.5" />
        ) : (
          'T'
        )}
      </span>
      <div className={cn('max-w-[80%] space-y-2', buyer && 'items-end')}>
        <div
          className={cn(
            'whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[14.5px] leading-relaxed shadow-sm',
            buyer
              ? 'rounded-tr-md bg-brand text-white'
              : message.role === 'AI'
                ? 'rounded-tl-md border border-line bg-white text-fg'
                : 'rounded-tl-md bg-brand-soft text-fg',
          )}
        >
          <span className="sr-only">
            {buyer ? 'Buyer: ' : message.role === 'AI' ? 'AI: ' : 'Team member: '}
          </span>
          {message.content}
        </div>
        {suggested.length > 0 && (
          <ul
            className="grid gap-2 sm:grid-cols-2"
            aria-label="Properties suggested in this message"
          >
            {suggested.map((p) => (
              <li
                key={p.id}
                className="rounded-xl border border-line bg-white p-3 text-xs shadow-sm"
              >
                <p className="flex items-center gap-1.5 font-semibold text-fg">
                  <Building2 className="size-3.5 text-gold-deep" aria-hidden />
                  <span className="truncate">{p.title}</span>
                </p>
                <p className="mt-1 text-fg-muted">
                  {formatInr(p.price)} · {[p.locality, p.city].filter(Boolean).join(', ')}
                </p>
              </li>
            ))}
          </ul>
        )}
        <p
          className={cn(
            'flex items-center gap-1 px-1 text-[11px] text-fg-faint',
            buyer && 'justify-end',
          )}
        >
          {message.role === 'AI' ? 'AI · ' : message.role === 'AGENT' ? 'Team · ' : ''}
          {timeFormat.format(new Date(message.createdAt))}
          <DeliveryTicks message={message} />
        </p>
        {message.deliveryStatus === 'FAILED' && (
          <p className="px-1 text-xs text-danger" role="status">
            Not delivered on WhatsApp{message.deliveryError ? `: ${message.deliveryError}` : '.'}
          </p>
        )}
      </div>
    </li>
  );
}

export function ChatPanel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const canWrite = usePermission(Permission.CONVERSATIONS_WRITE);
  const [draft, setDraft] = useState('');
  const [as, setAs] = useState<'BUYER' | 'AGENT'>('BUYER');
  const [pending, setPending] = useState<{ content: string; role: 'BUYER' | 'AGENT' } | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  const conversation = useQuery({
    queryKey: queryKeys.conversation(id),
    queryFn: () => api<ConversationDto>(`/conversations/${id}`),
    // Buyers write on WhatsApp in real time; keep the thread fresh while it is open.
    refetchInterval: (query) => (query.state.data?.channel === 'WHATSAPP' ? 4000 : false),
  });
  const leadId = conversation.data?.lead.id;
  const lead = useQuery({
    queryKey: queryKeys.lead(leadId ?? ''),
    queryFn: () => api<LeadDto>(`/leads/${leadId}`),
    enabled: Boolean(leadId),
  });
  // A visit the buyer asked for and the team has not confirmed yet.
  const visitRequest = useQuery({
    queryKey: queryKeys.siteVisits(`scope=requested&leadId=${leadId ?? ''}`),
    queryFn: () =>
      apiPage<SiteVisitDto>(`/site-visits?scope=requested&leadId=${leadId}&pageSize=1`),
    enabled: Boolean(leadId),
    refetchInterval: 15_000,
  });
  const canConfirmVisits = usePermission(Permission.SITE_VISITS_WRITE);
  const [visitDialog, setVisitDialog] = useState<VisitDialogMode | null>(null);
  const inventory = useQuery({
    queryKey: queryKeys.properties('chat-lookup'),
    queryFn: () => apiPage<PropertyDto>('/properties?pageSize=100'),
    staleTime: 60_000,
  });
  const propertyMap = useMemo(
    () => new Map((inventory.data?.data ?? []).map((p) => [p.id, p])),
    [inventory.data],
  );

  const isTest = conversation.data?.channel === 'WEB_TEST';
  const isWhatsApp = conversation.data?.channel === 'WHATSAPP';
  const sendAs = isTest ? as : 'AGENT';

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.conversation(id) });
    void queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    if (leadId) void queryClient.invalidateQueries({ queryKey: queryKeys.lead(leadId) });
    void queryClient.invalidateQueries({ queryKey: ['leads', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const send = useMutation({
    mutationFn: (content: string) =>
      api<ConversationTurnDto>(`/conversations/${id}/messages`, {
        method: 'POST',
        body: { content, as: sendAs },
      }),
    onMutate: (content) => setPending({ content, role: sendAs }),
    onSuccess: (turn) => {
      if (turn.buyerMessage.deliveryStatus === 'FAILED')
        toast.error(turn.buyerMessage.deliveryError ?? 'WhatsApp could not deliver the message');
      if (turn.aiError) toast.error(turn.aiError);
      if (turn.handoffRequested)
        toast.info('The AI handed this conversation to your team and paused.');
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Message not sent'),
    onSettled: async () => {
      refresh();
      await queryClient.refetchQueries({ queryKey: queryKeys.conversation(id) });
      setPending(null);
    },
  });

  const update = useMutation({
    mutationFn: (body: { aiEnabled?: boolean; status?: 'OPEN' | 'CLOSED' }) =>
      api<ConversationDto>(`/conversations/${id}`, { method: 'PATCH', body }),
    onSuccess: (c) => {
      queryClient.setQueryData(queryKeys.conversation(id), c);
      void queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] });
    },
    onError: (error) => toast.error(error instanceof ApiError ? error.message : 'Change not saved'),
  });

  const messageCount = conversation.data?.messages.length ?? 0;
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messageCount, pending]);

  if (conversation.isError)
    return <ErrorState error={conversation.error} onRetry={() => void conversation.refetch()} />;
  if (!conversation.data)
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-1/2" />
        <Skeleton className="h-16 w-2/3" />
        <Skeleton className="ml-auto h-16 w-2/3" />
      </div>
    );
  const c = conversation.data;
  const closed = c.status === 'CLOSED';
  const windowHours = isWhatsApp ? hoursLeft(c.replyWindowEndsAt) : null;
  const windowClosed = isWhatsApp && (windowHours === null || windowHours <= 0);

  const submit = (content: string) => {
    const text = content.trim();
    if (!text || send.isPending) return;
    setDraft('');
    send.mutate(text);
  };

  return (
    <div className="grid h-full min-h-0 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${c.lead.name}`}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="min-w-0">
            <Link
              href={`/dashboard/leads/${c.lead.id}`}
              className="font-semibold text-fg hover:text-brand-fg"
            >
              {c.lead.name}
            </Link>
            <p className="flex items-center gap-1.5 text-xs text-fg-muted">
              {isWhatsApp && <MessageCircle className="size-3.5 text-success" aria-hidden />}
              {c.lead.phone} · {CONVERSATION_CHANNEL_LABELS[c.channel]}
              {isWhatsApp && windowHours !== null && windowHours > 0 && (
                <span title="WhatsApp allows free replies for 24 hours after the buyer's last message">
                  · reply window {windowHours >= 1 ? `${Math.floor(windowHours)}h` : '<1h'} left
                </span>
              )}
            </p>
          </div>
          {canWrite && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="switch"
                aria-checked={c.aiEnabled}
                disabled={update.isPending || closed}
                onClick={() => update.mutate({ aiEnabled: !c.aiEnabled })}
                className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs font-semibold text-fg-secondary transition-colors hover:bg-canvas disabled:opacity-50"
              >
                <span
                  className={cn(
                    'relative h-4 w-7 rounded-full transition-colors',
                    c.aiEnabled ? 'bg-success' : 'bg-line-strong',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 size-3 rounded-full bg-white transition-all',
                      c.aiEnabled ? 'left-3.5' : 'left-0.5',
                    )}
                  />
                </span>
                AI {c.aiEnabled ? 'replying' : 'paused'}
              </button>
              <Button
                variant="secondary"
                size="sm"
                disabled={update.isPending}
                onClick={() => update.mutate({ status: closed ? 'OPEN' : 'CLOSED' })}
              >
                {closed ? 'Re-open' : 'Close'}
              </Button>
            </div>
          )}
        </header>

        {visitRequest.data?.data[0] && (
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-attention-soft px-5 py-3"
            role="status"
          >
            <p className="flex items-center gap-2 text-sm text-attention-fg">
              <CalendarCheck className="size-4 shrink-0" aria-hidden />
              <span>
                <strong>Site visit requested</strong>
                {visitRequest.data.data[0].requestedSlot
                  ? ` · “${visitRequest.data.data[0].requestedSlot}”`
                  : ''}
              </span>
            </p>
            {canConfirmVisits && (
              <Button
                size="sm"
                onClick={() =>
                  setVisitDialog({ kind: 'confirm', visit: visitRequest.data!.data[0]! })
                }
              >
                Confirm a time
              </Button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-canvas px-4 py-6 sm:px-6">
          {c.messages.length === 0 && !pending ? (
            <div className="mx-auto max-w-md py-10 text-center">
              <Bot className="mx-auto size-8 text-gold-deep" aria-hidden />
              <p className="mt-3 font-semibold text-fg">
                {isTest ? 'Say hello as the buyer' : 'No messages yet'}
              </p>
              {isTest && (
                <p className="mt-1 text-sm text-fg-muted">Try one of these, or write your own:</p>
              )}
              {canWrite && isTest && (
                <ul className="mt-5 space-y-2 text-left">
                  {SAMPLE_MESSAGES.map((m) => (
                    <li key={m}>
                      <button
                        type="button"
                        onClick={() => submit(m)}
                        className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm text-fg-secondary shadow-sm transition hover:border-brand-line hover:text-fg"
                      >
                        {m}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <ol className="space-y-5" aria-live="polite">
              {c.messages.map((m) => (
                <Message key={m.id} message={m} properties={propertyMap} />
              ))}
              {pending && (
                <>
                  <li
                    className={cn(
                      'flex',
                      pending.role === 'BUYER' ? 'justify-end' : 'justify-start',
                    )}
                  >
                    <p
                      className={cn(
                        'max-w-[80%] rounded-2xl px-4 py-2.5 text-[14.5px] opacity-70',
                        pending.role === 'BUYER'
                          ? 'rounded-tr-md bg-brand text-white'
                          : 'rounded-tl-md bg-brand-soft text-fg',
                      )}
                    >
                      {pending.content}
                    </p>
                  </li>
                  {pending.role === 'BUYER' && c.aiEnabled && (
                    <li className="flex items-center gap-2 text-xs text-fg-muted" role="status">
                      <span className="flex size-7 items-center justify-center rounded-full bg-gold text-brand-deep">
                        <Bot className="size-3.5" aria-hidden />
                      </span>
                      <span className="flex gap-1" aria-hidden>
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-faint" />
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-faint [animation-delay:120ms]" />
                        <span className="size-1.5 animate-bounce rounded-full bg-fg-faint [animation-delay:240ms]" />
                      </span>
                      AI is typing…
                    </li>
                  )}
                </>
              )}
            </ol>
          )}
          <div ref={bottom} />
        </div>

        {canWrite && (
          <footer className="border-t border-line bg-white p-4">
            {closed ? (
              <p className="flex items-center gap-2 text-sm text-fg-muted">
                <Lock className="size-4" /> This conversation is closed. Re-open it to continue.
              </p>
            ) : windowClosed ? (
              <p className="flex items-start gap-2 text-sm text-fg-muted">
                <Clock3 className="mt-0.5 size-4 shrink-0" />
                WhatsApp only allows free replies within 24 hours of the buyer’s last message. You
                can reply again as soon as they write.
              </p>
            ) : (
              <form
                className="space-y-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(draft);
                }}
              >
                {isTest && (
                  <div
                    className="flex items-center gap-1 text-xs"
                    role="radiogroup"
                    aria-label="Send as"
                  >
                    {(['BUYER', 'AGENT'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        role="radio"
                        aria-checked={as === role}
                        onClick={() => setAs(role)}
                        className={cn(
                          'rounded-full px-3 py-1 font-semibold transition-colors',
                          as === role ? 'bg-brand text-white' : 'text-fg-muted hover:bg-subtle',
                        )}
                      >
                        {role === 'BUYER' ? 'Write as buyer' : 'Write as team member'}
                      </button>
                    ))}
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Textarea
                    aria-label="Message"
                    rows={1}
                    maxLength={2000}
                    className="max-h-40 min-h-11 resize-none"
                    placeholder={
                      sendAs === 'BUYER'
                        ? 'Type what a buyer would say…'
                        : isWhatsApp
                          ? 'Reply on WhatsApp as your team…'
                          : 'Reply as your team…'
                    }
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        submit(draft);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="size-11 shrink-0"
                    aria-label="Send"
                    loading={send.isPending}
                  >
                    {!send.isPending && <SendHorizonal />}
                  </Button>
                </div>
              </form>
            )}
          </footer>
        )}
        <VisitDialog mode={visitDialog} onOpenChange={(open) => !open && setVisitDialog(null)} />
      </section>

      <aside
        className="hidden min-h-0 overflow-y-auto border-l border-line bg-white p-5 xl:block"
        aria-label="Lead profile"
      >
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-attention-fg">
          What the AI learned
        </p>
        {lead.data ? (
          <>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <TemperatureBadge value={lead.data.temperature} />
              <LeadStatusBadge value={lead.data.status} />
              {!c.aiEnabled && <Badge tone="warning">Human handling</Badge>}
            </div>
            <div className="mt-5">
              <LeadFacts lead={lead.data} />
            </div>
            <p className="mt-6 text-xs leading-relaxed text-fg-muted">
              Updates after every buyer message. Every change the AI makes is recorded in the audit
              log.
            </p>
          </>
        ) : (
          <Skeleton className="mt-4 h-48" />
        )}
      </aside>
    </div>
  );
}
