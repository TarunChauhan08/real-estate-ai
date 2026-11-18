import { BadgeCheck, CalendarCheck, Flame, MapPin, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';

const CHAT = [
  {
    from: 'buyer',
    text: 'Hi, Sector 150 mein 3 BHK chahiye. Budget 85 lakh tak.',
    time: '11:42 pm',
  },
  {
    from: 'ai',
    text: 'Namaste! Sector 150 mein 85 lakh tak 2 ready-to-move 3 BHK options hain. Self-use ke liye dekh rahe hain?',
    time: '11:42 pm',
  },
  {
    from: 'buyer',
    text: 'Haan, family ke liye. Is Saturday visit ho sakti hai?',
    time: '11:43 pm',
  },
  {
    from: 'ai',
    text: 'Bilkul! Saturday 11 baje ya 4 baje — kaunsa time theek rahega? Team confirm kar degi.',
    time: '11:43 pm',
  },
];

/** A phone-style chat built in code — sharper than any screenshot at any resolution. */
export function ChatPreview({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        'w-full max-w-sm overflow-hidden rounded-[28px] border border-white/15 bg-white/95 shadow-[var(--shadow-lift)] backdrop-blur',
        className,
      )}
      aria-label="Example conversation between a buyer and the AI sales employee, in Hinglish"
    >
      <div className="flex items-center gap-3 bg-brand px-5 py-4 text-white">
        <span className="flex size-9 items-center justify-center rounded-full bg-gold text-sm font-bold text-white">
          AI
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Your AI sales employee</p>
          <p className="flex items-center gap-1.5 text-xs text-brand-line">
            <span className="size-1.5 rounded-full bg-emerald-400" aria-hidden /> Online · replies
            in seconds
          </p>
        </div>
      </div>
      <ul className="space-y-2.5 bg-canvas px-4 py-5">
        {CHAT.map((m, i) => (
          <li key={i} className={m.from === 'buyer' ? 'flex justify-end' : 'flex'}>
            <p
              className={cn(
                'max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-snug shadow-sm',
                m.from === 'buyer'
                  ? 'rounded-br-md bg-brand text-white'
                  : 'rounded-bl-md border border-line bg-white text-fg',
              )}
            >
              {m.text}
              <span
                className={cn(
                  'mt-1 block text-[10px]',
                  m.from === 'buyer' ? 'text-brand-line' : 'text-fg-muted',
                )}
              >
                {m.time}
              </span>
            </p>
          </li>
        ))}
      </ul>
      <figcaption className="sr-only">Illustrative example</figcaption>
    </figure>
  );
}

/** What the business sees seconds later: the same buyer as a qualified, scored lead. */
export function LeadPreview({ className }: { className?: string }) {
  const facts = [
    { icon: Wallet, label: 'Budget', value: 'up to ₹85 lakh' },
    { icon: MapPin, label: 'Looking in', value: 'Sector 150, Noida' },
    { icon: BadgeCheck, label: 'Need', value: '3 BHK · self-use · ready to move' },
    { icon: CalendarCheck, label: 'Next step', value: 'Site visit, Saturday' },
  ];
  return (
    <div
      className={cn(
        'w-full max-w-xs rounded-2xl border border-line bg-white p-5 shadow-[var(--shadow-lift)]',
        className,
      )}
      aria-label="Example lead card created by the AI"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-fg-muted">
            New lead · WhatsApp
          </p>
          <p className="mt-1 text-base font-semibold text-fg">Rahul Sharma</p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-attention-soft px-2.5 py-1 text-xs font-bold text-attention-fg">
          <Flame className="size-3.5" aria-hidden /> Hot
        </span>
      </div>
      <dl className="mt-4 space-y-2.5">
        {facts.map(({ icon: Icon, label, value }) => (
          // A <div> directly inside <dl> is valid; it groups one term with its description.
          <div key={label} className="grid grid-cols-[1rem_1fr] gap-x-2.5">
            <dt className="col-start-2 text-[11px] text-fg-muted">{label}</dt>
            <dd className="col-start-2 text-[13px] font-medium text-fg-secondary">{value}</dd>
            <Icon className="col-start-1 row-start-1 mt-0.5 size-4 text-gold-deep" aria-hidden />
          </div>
        ))}
      </dl>
      <p className="mt-4 rounded-lg bg-success-soft px-3 py-2 text-xs font-semibold text-success">
        Qualified automatically · assigned to Arjun
      </p>
    </div>
  );
}

/** A slice of the dashboard: the lead pipeline, so visitors see the product, not just promises. */
export function PipelinePreview() {
  const rows = [
    {
      name: 'Rahul Sharma',
      need: '3 BHK · Sector 150',
      budget: '₹85 L',
      temp: 'Hot',
      status: 'Site visit',
    },
    {
      name: 'Sneha Iyer',
      need: '2 BHK · Sector 137',
      budget: '₹70 L',
      temp: 'Warm',
      status: 'Qualified',
    },
    {
      name: 'Imran Khan',
      need: 'Villa · Greater Noida',
      budget: '₹2.1 Cr',
      temp: 'Warm',
      status: 'Contacted',
    },
    {
      name: 'Pooja Bansal',
      need: '3 BHK · Sector 128',
      budget: '₹1.4 Cr',
      temp: 'Hot',
      status: 'Negotiation',
    },
    { name: 'New buyer', need: 'Asking about rentals', budget: '—', temp: 'Cold', status: 'New' },
  ];
  const tone: Record<string, string> = {
    Hot: 'bg-attention-soft text-attention-fg',
    Warm: 'bg-brand-soft text-brand-fg',
    Cold: 'bg-subtle text-fg-muted',
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white shadow-[var(--shadow-lift)]">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <p className="text-sm font-semibold text-fg">Leads</p>
        <div className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead className="bg-canvas text-[11px] uppercase tracking-wider text-fg-muted">
            <tr>
              <th className="px-5 py-2.5 font-semibold">Buyer</th>
              <th className="px-5 py-2.5 font-semibold">Looking for</th>
              <th className="px-5 py-2.5 font-semibold">Budget</th>
              <th className="px-5 py-2.5 font-semibold">Score</th>
              <th className="px-5 py-2.5 font-semibold">Stage</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-subtle">
            {rows.map((r) => (
              <tr key={r.name}>
                <td className="px-5 py-3 font-medium text-fg">{r.name}</td>
                <td className="px-5 py-3 text-fg-muted">{r.need}</td>
                <td className="px-5 py-3 tabular-nums text-fg-secondary">{r.budget}</td>
                <td className="px-5 py-3">
                  <span
                    className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', tone[r.temp])}
                  >
                    {r.temp}
                  </span>
                </td>
                <td className="px-5 py-3 text-fg-secondary">{r.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
