import { LANGUAGE_LABELS, PreferredLanguage } from '@rea/shared-types';
import { Bot } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * The AI employee presented as a staff ID card. It reports what is true today:
 * the AI works in test chats inside the dashboard; buyer-facing channels are not connected yet.
 */
export function AiEmployeeIdCard({
  businessName,
  compact = false,
}: {
  businessName: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-[var(--radius-panel)] bg-brand text-white shadow-[var(--shadow-lift)]',
        compact ? 'p-5' : 'p-6 sm:p-7',
      )}
      aria-label="AI employee status: ready to test, no buyer channels connected"
    >
      <div
        className="absolute -right-16 -top-16 size-48 rounded-full bg-gold/15 blur-2xl"
        aria-hidden
      />
      <div className="relative flex items-start gap-4">
        <div
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-gold text-brand-deep"
        >
          <Bot className="size-7" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-brand-line">{businessName}</p>
          <p className="mt-0.5 text-lg font-bold tracking-tight">AI sales employee</p>
          <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-gold-light">
            <span className="size-1.5 rounded-full bg-gold" aria-hidden />
            Ready to test · not live with buyers yet
          </p>
        </div>
      </div>
      {!compact && (
        <dl className="relative mt-6 grid gap-4 border-t border-white/10 pt-5 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-brand-line">Languages</dt>
            <dd className="mt-1 font-medium">
              {Object.values(PreferredLanguage)
                .map((code) => LANGUAGE_LABELS[code])
                .join(', ')}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-brand-line">Works from</dt>
            <dd className="mt-1 font-medium">Your listings and lead pipeline</dd>
          </div>
          <div>
            <dt className="text-xs text-brand-line">Channels</dt>
            <dd className="mt-1 font-medium">Test chat · WhatsApp</dd>
          </div>
        </dl>
      )}
    </div>
  );
}
