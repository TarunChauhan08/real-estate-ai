'use client';

import { useQuery } from '@tanstack/react-query';
import { type ConversationSummaryDto, CONVERSATION_CHANNEL_LABELS } from '@rea/shared-types';
import { MessagesSquare } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { EmptyState, ErrorState } from '@/components/states/states';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { apiPage } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn, formatDateTime } from '@/lib/utils';
import { ChatPanel } from './chat-panel';

export function ConversationsView() {
  const selected = useSearchParams().get('id');
  const list = useQuery({
    queryKey: queryKeys.conversations('page=1'),
    queryFn: () => apiPage<ConversationSummaryDto>('/conversations?pageSize=50'),
    // New WhatsApp chats appear without a page reload.
    refetchInterval: 10_000,
  });

  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-[520px] overflow-hidden rounded-[var(--radius-panel)] border border-line bg-white shadow-[var(--shadow-soft)]">
      <aside
        className={cn(
          'flex w-full flex-col border-r border-line md:w-80 md:shrink-0',
          selected && 'hidden md:flex',
        )}
        aria-label="Conversations"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3.5">
          <h1 className="font-semibold text-fg">Conversations</h1>
          <Button asChild size="sm" variant="secondary">
            <Link href="/dashboard/ai-employee">New test chat</Link>
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {list.isError ? (
            <div className="p-4">
              <ErrorState error={list.error} onRetry={() => void list.refetch()} />
            </div>
          ) : !list.data ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : list.data.data.length === 0 ? (
            <EmptyState
              icon={MessagesSquare}
              title="No conversations yet"
              description="Start a test chat to see your AI employee at work."
              action={
                <Button asChild size="sm">
                  <Link href="/dashboard/ai-employee">Start a test chat</Link>
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-subtle">
              {list.data.data.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/conversations?id=${c.id}`}
                    aria-current={c.id === selected ? 'page' : undefined}
                    className={cn(
                      'block px-4 py-3 transition-colors hover:bg-canvas',
                      c.id === selected && 'bg-brand-soft hover:bg-brand-soft',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold text-fg">{c.lead.name}</p>
                      <span className="shrink-0 text-[11px] text-fg-muted">
                        {formatDateTime(c.lastMessageAt ?? c.createdAt)}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-fg-muted">
                      {c.lastMessage
                        ? `${c.lastMessage.role === 'AI' ? 'AI: ' : c.lastMessage.role === 'AGENT' ? 'Team: ' : ''}${c.lastMessage.content}`
                        : 'No messages yet'}
                    </p>
                    <p className="mt-1.5 flex items-center gap-2 text-[11px] text-fg-muted">
                      <span
                        className={cn(
                          'size-1.5 rounded-full',
                          c.status === 'CLOSED'
                            ? 'bg-line-strong'
                            : c.aiEnabled
                              ? 'bg-success'
                              : 'bg-attention',
                        )}
                        aria-hidden
                      />
                      {CONVERSATION_CHANNEL_LABELS[c.channel]} ·{' '}
                      {c.status === 'CLOSED'
                        ? 'Closed'
                        : c.aiEnabled
                          ? 'AI replying'
                          : 'Human handling'}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
      <div className={cn('min-w-0 flex-1', !selected && 'hidden md:block')}>
        {selected ? (
          <div className="flex h-full flex-col">
            <Link
              href="/dashboard/conversations"
              className="border-b border-line px-4 py-2 text-sm text-fg-muted md:hidden"
            >
              ← All conversations
            </Link>
            <div className="min-h-0 flex-1">
              <ChatPanel key={selected} id={selected} />
            </div>
          </div>
        ) : (
          <div className="flex h-full items-center justify-center bg-canvas">
            <EmptyState
              icon={MessagesSquare}
              title="Pick a conversation"
              description="Read what buyers said, what the AI answered, and step in whenever you want."
            />
          </div>
        )}
      </div>
    </div>
  );
}
