import { cn } from '@/lib/utils';

/** Wordmark: a roofline over an open doorway, set beside the product name. */
export function Logo({ className, inverted = false }: { className?: string; inverted?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
        <rect width="32" height="32" rx="8" className={inverted ? 'fill-white/10' : 'fill-brand'} />
        <path
          d="M7 15.5 16 8l9 7.5"
          fill="none"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="stroke-attention"
        />
        <path
          d="M10.5 14v10h4v-5.5h3V24h4V14"
          fill="none"
          strokeWidth="2.2"
          strokeLinejoin="round"
          className="stroke-white"
        />
      </svg>
      <span
        className={cn(
          'text-[15px] font-bold leading-tight tracking-tight',
          inverted ? 'text-white' : 'text-brand',
        )}
      >
        Sales Employee
        <span
          className={cn(
            'block font-mono text-[10px] font-normal uppercase tracking-[0.12em]',
            inverted ? 'text-brand-line' : 'text-fg-muted',
          )}
        >
          for real estate
        </span>
      </span>
    </span>
  );
}
