'use client';

import { useQuery } from '@tanstack/react-query';
import { type AiUsageDay, type AiUsageSummary } from '@rea/shared-types';
import { useState } from 'react';
import { ErrorState } from '@/components/states/states';
import { Select } from '@/components/ui/input';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const LANGUAGE_LABELS: Record<string, string> = {
  hinglish: 'Hinglish',
  hi: 'Hindi',
  en: 'English',
  unknown: 'Other',
};

const compact = (n: number) =>
  new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  });

/** How much the AI employee has worked: volume, speed, reliability and languages. */
export function AiUsagePanel() {
  const [days, setDays] = useState(30);
  const usage = useQuery({
    queryKey: queryKeys.aiUsage(days),
    queryFn: () => api<AiUsageSummary>(`/dashboard/ai-usage?days=${days}`),
  });

  return (
    <Panel aria-label="AI usage">
      <PanelHeader
        title="Usage"
        description="Replies your AI employee sent, and the model tokens they used"
        actions={
          <Select
            aria-label="Period"
            className="h-8 w-36"
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </Select>
        }
      />
      {usage.isError ? (
        <ErrorState error={usage.error} onRetry={() => void usage.refetch()} />
      ) : !usage.data ? (
        <div className="space-y-4 p-5">
          <Skeleton className="h-16" />
          <Skeleton className="h-28" />
        </div>
      ) : (
        <UsageBody usage={usage.data} />
      )}
    </Panel>
  );
}

function UsageBody({ usage }: { usage: AiUsageSummary }) {
  const answered = usage.replies + usage.failedReplies;
  const stats = [
    { label: 'AI replies', value: usage.replies.toLocaleString('en-IN') },
    {
      label: 'Avg. response time',
      value:
        usage.averageLatencyMs === null ? '—' : `${(usage.averageLatencyMs / 1000).toFixed(1)} s`,
    },
    {
      label: 'Tokens (in / out)',
      value: `${compact(usage.inputTokens)} / ${compact(usage.outputTokens)}`,
    },
    {
      label: 'Reliability',
      value: answered === 0 ? '—' : `${((usage.replies / answered) * 100).toFixed(1)}%`,
      hint: usage.failedReplies ? `${usage.failedReplies} failed` : undefined,
    },
  ];
  const languages = Object.entries(usage.languages).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-5 p-5">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-fg-muted">{s.label}</dt>
            <dd className="mt-0.5 text-lg font-semibold tabular-nums text-fg">{s.value}</dd>
            {s.hint && <dd className="text-xs text-fg-muted">{s.hint}</dd>}
          </div>
        ))}
      </dl>

      <DailyReplies daily={usage.daily} />

      <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-fg-muted">
        <span>
          Handed to your team: <strong className="text-fg">{usage.handoffs}</strong>
        </span>
        <span>
          Site visits requested: <strong className="text-fg">{usage.siteVisitRequests}</strong>
        </span>
        {languages.length > 0 && (
          <span>
            Languages:{' '}
            <strong className="text-fg">
              {languages
                .map(
                  ([lang, n]) =>
                    `${LANGUAGE_LABELS[lang] ?? lang} ${Math.round((n / usage.replies) * 100)}%`,
                )
                .join(' · ')}
            </strong>
          </span>
        )}
      </div>
    </div>
  );
}

/** One bar per day (single series, so the heading names it — no legend). */
function DailyReplies({ daily }: { daily: AiUsageDay[] }) {
  const peak = Math.max(0, ...daily.map((d) => d.replies));
  const max = Math.max(1, peak);
  const [hover, setHover] = useState<number | null>(null);
  const active = hover === null ? null : daily[hover];
  const first = daily[0];
  const last = daily.at(-1);

  return (
    <figure>
      <figcaption className="mb-2 flex items-baseline justify-between text-xs text-fg-muted">
        <span>Replies per day</span>
        <span aria-live="polite" className="tabular-nums text-fg">
          {active
            ? `${dayLabel(active.date)} · ${active.replies} ${active.replies === 1 ? 'reply' : 'replies'} · ${compact(active.inputTokens + active.outputTokens)} tokens`
            : `Busiest day: ${peak}`}
        </span>
      </figcaption>
      <div
        className="flex h-28 items-end gap-[2px] border-b border-line"
        aria-hidden
        onMouseLeave={() => setHover(null)}
      >
        {daily.map((d, i) => (
          <div
            key={d.date}
            className="flex h-full flex-1 items-end"
            onMouseEnter={() => setHover(i)}
          >
            <div
              className={
                hover === i ? 'w-full rounded-t bg-brand-strong' : 'w-full rounded-t bg-brand'
              }
              style={{ height: d.replies ? `${Math.max(3, (d.replies / max) * 100)}%` : 0 }}
            />
          </div>
        ))}
      </div>
      {first && last && (
        <div className="mt-1 flex justify-between text-[11px] text-fg-muted" aria-hidden>
          <span>{dayLabel(first.date)}</span>
          <span>{dayLabel(last.date)}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>AI replies per day</caption>
        <thead>
          <tr>
            <th>Date</th>
            <th>Replies</th>
            <th>Tokens</th>
          </tr>
        </thead>
        <tbody>
          {daily.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{d.replies}</td>
              <td>{d.inputTokens + d.outputTokens}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
