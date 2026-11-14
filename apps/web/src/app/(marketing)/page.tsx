import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { DEMO_REQUEST_EMAIL } from '@/lib/env';

const CONVERSATION = [
  { from: 'buyer', text: 'Hi, mujhe Sector 150 mein 3 BHK chahiye. Budget 80 lakh hai.' },
  { from: 'ai', text: 'Namaste! Sector 150 mein 80 lakh tak ke 3 BHK options hain. Ready-to-move chahiye ya under-construction bhi chalega?' },
  { from: 'buyer', text: 'Ready to move. Is weekend site visit ho sakti hai?' },
  { from: 'ai', text: 'Bilkul. Saturday 11 baje ya Sunday 4 baje — kaunsa time aapke liye theek rahega?' },
];

const STEPS = [
  { title: 'Every enquiry answered', body: 'Website chat, WhatsApp and phone calls get a reply in Hindi, English or Hinglish, at any hour.' },
  { title: 'Buyers qualified for you', body: 'Budget, location, BHK and timeline are captured and scored, so your team calls the hot leads first.' },
  { title: 'Site visits on the calendar', body: 'Matching properties from your verified inventory, then a visit booked with the right salesperson.' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="sm" className="sm:h-10 sm:px-4">
            <Link href="/login">Sign in</Link>
          </Button>
          <Button asChild size="sm" className="sm:h-10 sm:px-4">
            <Link href="/register">
              Register<span className="hidden sm:inline">&nbsp;your business</span>
            </Link>
          </Button>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 lg:grid-cols-2 lg:pt-16">
          <div>
            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-brand sm:text-5xl">
              Never miss a property enquiry.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-relaxed text-fg-muted">
              An AI sales employee for brokers, agencies, builders and developers in India. It talks to buyers, qualifies
              them and books site visits, so your team spends its time closing.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {DEMO_REQUEST_EMAIL && (
                <Button asChild size="lg">
                  <a href={`mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent('Private demo request')}`}>
                    Request a private demo
                  </a>
                </Button>
              )}
              <Button asChild size="lg" variant={DEMO_REQUEST_EMAIL ? 'secondary' : 'primary'}>
                <Link href="/login">Sign in to your workspace</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-fg-muted">
              The AI employee is in development. Business accounts and team management are available today.
            </p>
          </div>

          <figure className="rounded-[var(--radius-panel)] bg-brand p-5 sm:p-6" aria-label="Example conversation in Hinglish">
            <figcaption className="mb-4 text-xs text-brand-line">Example of the planned conversation style</figcaption>
            <ul className="space-y-3">
              {CONVERSATION.map((msg, i) => (
                <li key={i} className={msg.from === 'buyer' ? 'flex justify-end' : 'flex'}>
                  <p
                    className={
                      msg.from === 'buyer'
                        ? 'max-w-[85%] rounded-2xl rounded-br-md bg-attention px-4 py-2.5 text-[15px] text-brand-deep'
                        : 'max-w-[85%] rounded-2xl rounded-bl-md bg-white/10 px-4 py-2.5 text-[15px] text-white'
                    }
                  >
                    {msg.text}
                  </p>
                </li>
              ))}
            </ul>
          </figure>
        </section>

        <section className="border-t border-line bg-canvas">
          <div className="mx-auto max-w-6xl px-6 py-16">
            <h2 className="text-2xl font-bold tracking-tight text-fg">How it works</h2>
            <ol className="mt-8 grid gap-8 md:grid-cols-3">
              {STEPS.map((step, i) => (
                <li key={step.title}>
                  <span className="text-sm font-bold text-attention-fg">Step {i + 1}</span>
                  <h3 className="mt-1 text-lg font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-fg-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-6 py-8 text-sm text-fg-muted">
        © {new Date().getFullYear()} AI Real Estate Sales Employee
      </footer>
    </div>
  );
}
