import { type FaqItem } from '@/lib/marketing-content';

/** Accessible, no-JS FAQ accordion (native <details>). Pair with faqLd() structured data. */
export function FaqList({ items }: { items: FaqItem[] }) {
  return (
    <div className="divide-y divide-line border-y border-line">
      {items.map(({ q, a }) => (
        <details key={q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-fg">
            <h3 className="text-lg font-semibold">{q}</h3>
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line text-brand transition-transform group-open:rotate-45"
              aria-hidden
            >
              +
            </span>
          </summary>
          <p className="mt-3 max-w-2xl leading-relaxed text-fg-muted">{a}</p>
        </details>
      ))}
    </div>
  );
}
