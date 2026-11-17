'use client';

import { useQuery } from '@tanstack/react-query';
import { type DashboardOverview, type MetricValue, Permission } from '@rea/shared-types';
import { Check } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/dashboard-shell';
import { ErrorState } from '@/components/states/states';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { AiEmployeeIdCard } from '@/features/ai-employee/ai-employee-card';
import { useAuth } from '@/features/auth/auth-provider';
import { usePermission } from '@/hooks/use-permission';
import { api } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { cn } from '@/lib/utils';

const METRICS: Array<{ key: keyof DashboardOverview['metrics']; label: string }> = [
  { key: 'totalLeads', label: 'Total leads' },
  { key: 'qualifiedLeads', label: 'Qualified leads' },
  { key: 'siteVisits', label: 'Upcoming site visits' },
  { key: 'conversations', label: 'Conversations' },
  { key: 'aiCalls', label: 'AI calls' },
  { key: 'teamMembers', label: 'Team members' },
];

function MetricCell({ label, metric }: { label: string; metric: MetricValue }) {
  return (
    <div className="px-5 py-4">
      <dt className="text-sm text-fg-muted">{label}</dt>
      {metric.status === 'available' ? (
        <dd className="mt-1 text-2xl font-bold tracking-tight text-fg tabular-nums">
          {metric.value.toLocaleString('en-IN')}
        </dd>
      ) : (
        <dd className="mt-1">
          <span className="text-2xl font-bold tracking-tight text-line-strong" aria-hidden>
            —
          </span>
          <span className="block text-xs text-fg-muted">Not configured</span>
        </dd>
      )}
    </div>
  );
}

export function Overview() {
  const overview = useQuery({
    queryKey: queryKeys.overview,
    queryFn: () => api<DashboardOverview>('/dashboard/overview'),
  });
  const canInvite = usePermission(Permission.MEMBERS_INVITE);
  const firstName = useAuth().session?.user.name.split(' ')[0] ?? '';

  if (overview.isError)
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  const data = overview.data;

  return (
    <>
      <PageHeader
        title={firstName ? `Welcome, ${firstName}` : 'Overview'}
        description="Here is where your business stands. Numbers appear as each module goes live; nothing is estimated."
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Panel>
          <PanelHeader
            title="Get set up"
            description={
              data
                ? `${data.setup.completed} of ${data.setup.total} steps complete`
                : 'Loading progress'
            }
          />
          {data ? (
            <>
              <div className="px-5 pt-4">
                <div
                  className="h-1.5 overflow-hidden rounded-full bg-subtle"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={data.setup.total}
                  aria-valuenow={data.setup.completed}
                  aria-label="Setup progress"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-brand-fg to-gold"
                    style={{ width: `${(data.setup.completed / data.setup.total) * 100}%` }}
                  />
                </div>
              </div>
              <ol className="divide-y divide-subtle px-5 py-2">
                {data.setup.steps.map((step, index) => (
                  <li key={step.key} className="flex items-center gap-3 py-3">
                    <span
                      className={cn(
                        'flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
                        step.completed
                          ? 'bg-brand text-white'
                          : step.available
                            ? 'border border-line-strong text-fg-muted'
                            : 'border border-dashed border-line-strong text-fg-muted',
                      )}
                      aria-hidden
                    >
                      {step.completed ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        'flex-1 text-sm',
                        step.completed ? 'text-fg-muted' : 'font-medium text-fg',
                        !step.available && 'font-normal text-fg-muted',
                      )}
                    >
                      {step.label}
                      <span className="sr-only">
                        {step.completed
                          ? ' (done)'
                          : step.available
                            ? ' (to do)'
                            : ' (coming soon)'}
                      </span>
                    </span>
                    {!step.completed && !step.available && <Badge>Coming soon</Badge>}
                    {!step.completed && step.key === 'team_invited' && canInvite && (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/dashboard/team">Invite team</Link>
                      </Button>
                    )}
                    {!step.completed && step.key === 'properties' && (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/dashboard/properties">Add listings</Link>
                      </Button>
                    )}
                    {!step.completed && step.key === 'ai_employee' && (
                      <Button asChild size="sm" variant="secondary">
                        <Link href="/dashboard/ai-employee">Open test chat</Link>
                      </Button>
                    )}
                  </li>
                ))}
              </ol>
            </>
          ) : (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }, (_, i) => (
                <Skeleton key={i} className="h-6" />
              ))}
            </div>
          )}
        </Panel>

        <div className="space-y-3">
          <h2 className="text-[15px] font-semibold text-fg">Your AI employee</h2>
          {data ? (
            <AiEmployeeIdCard businessName={data.tenant.name} compact />
          ) : (
            <Skeleton className="h-32" />
          )}
          <p className="text-sm text-fg-muted">
            Chat with it as if you were a buyer and watch it qualify the lead from your own
            listings.{' '}
            <Link
              href="/dashboard/ai-employee"
              className="font-semibold text-brand-fg hover:underline"
            >
              Start a test chat
            </Link>
          </p>
        </div>
      </div>

      <Panel className="mt-6">
        <PanelHeader title="Activity" description="Live counts from your workspace" />
        <dl className="grid grid-cols-2 divide-x divide-y divide-subtle sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {METRICS.map((metric) =>
            data ? (
              <MetricCell key={metric.key} label={metric.label} metric={data.metrics[metric.key]} />
            ) : (
              <div key={metric.key} className="px-5 py-4">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="mt-2 h-7 w-12" />
              </div>
            ),
          )}
        </dl>
      </Panel>
    </>
  );
}
