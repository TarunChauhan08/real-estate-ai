import { LANGUAGE_LABELS, PreferredLanguage } from '@rea/shared-types';
import { cn } from '@/lib/utils';

/**
 * The AI employee presented as a staff ID card. In Phase 1 it is intentionally blank:
 * nothing is configured and no AI is running.
 */
export function AiEmployeeIdCard({ businessName, compact = false }: { businessName: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-panel)] border border-dashed border-brand-line bg-white',
        compact ? 'p-5' : 'p-6 sm:p-7',
      )}
      aria-label="AI employee status: not configured"
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden
          className="flex size-16 shrink-0 items-center justify-center rounded-[var(--radius-control)] border border-dashed border-line-strong bg-canvas text-2xl font-bold text-line-strong"
        >
          ?
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-fg-muted">{businessName}</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight text-fg-muted">Unnamed AI employee</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-attention-soft px-2.5 py-1 text-xs font-semibold text-attention-fg">
            <span className="size-1.5 rounded-full bg-attention" aria-hidden />
            Not configured, not active
          </p>
        </div>
      </div>
      {!compact && (
        <dl className="mt-6 grid gap-4 border-t border-dashed border-line pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-fg-muted">Languages</dt>
            <dd className="mt-1 font-medium text-fg-secondary">
              {Object.values(PreferredLanguage)
                .map((code) => LANGUAGE_LABELS[code])
                .join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Voice</dt>
            <dd className="mt-1 font-medium text-fg-muted">Not selected</dd>
          </div>
          <div>
            <dt className="text-xs text-fg-muted">Channels</dt>
            <dd className="mt-1 font-medium text-fg-muted">None connected</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
