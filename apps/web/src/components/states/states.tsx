import { CircleAlert, LoaderCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApiError } from '@/lib/api-client';

export function FullPageLoader({ label = 'Loading your workspace' }: { label?: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status">
      <LoaderCircle className="size-5 animate-spin text-brand-fg" aria-hidden />
      <span className="ml-3 text-sm text-fg-muted">{label}</span>
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message =
    error instanceof ApiError
      ? error.status === 403
        ? 'Your role does not have access to this information.'
        : error.message
      : 'Something went wrong while loading this section.';
  return (
    <div role="alert" className="flex flex-col items-start gap-3 rounded-[var(--radius-panel)] border border-danger/20 bg-danger-soft p-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-danger">
        <CircleAlert className="size-4" aria-hidden />
        Couldn’t load this section
      </div>
      <p className="text-sm text-fg-secondary">{message}</p>
      {error instanceof ApiError && error.requestId && (
        <p className="text-xs text-fg-muted">Reference: {error.requestId}</p>
      )}
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <div className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-fg">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-sm font-semibold text-fg">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-fg-muted">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
