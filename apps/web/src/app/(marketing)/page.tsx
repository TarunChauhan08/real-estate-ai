import {
  ArrowRight,
  BadgeCheck,
  Building,
  Building2,
  Check,
  ClipboardList,
  Clock3,
  Eye,
  Handshake,
  Home,
  KeyRound,
  Languages,
  Lock,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  ToggleRight,
  UserCheck,
  Users,
} from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/brand/logo';
import { Photo } from '@/components/marketing/photo';
import { ChatPreview, LeadPreview, PipelinePreview } from '@/components/marketing/product-preview';
import { SiteHeader } from '@/components/marketing/site-header';
import { Button } from '@/components/ui/button';
import { DEMO_REQUEST_EMAIL } from '@/lib/env';

export const metadata: Metadata = {
  title: 'AI Sales Employee for Indian Real Estate',
  description:
    'An AI sales employee that answers every property enquiry in Hindi, English and Hinglish, qualifies buyers and books site visits — for brokers, agencies, builders and developers.',
};

/*
 * Page structure follows how a cautious buyer of software decides:
 *   1. Recognition  — "this is for me" (hero names the audience and the outcome in one line)
 *   2. Pain         — loss aversion: what an unanswered enquiry costs
 *   3. Mechanism    — how it works, in three plain steps
 *   4. Proof        — the real product on screen, not adjectives
 *   5. Risk removal — trust, control and honest answers to objections
 *   6. One action   — the same gold button, repeated, never competing with another
 *
 * Honesty is part of the trust strategy: no invented customer logos, testimonials or statistics.
 */

const AUDIENCES = [
  { icon: Handshake, label: 'Brokers' },
  { icon: Building, label: 'Agencies' },
  { icon: Building2, label: 'Builders' },
  { icon: Home, label: 'Developers' },
  { icon: Users, label: 'Channel partners' },
];

const PAINS = [
  {
    title: 'Enquiries arrive when nobody is free',
    body: 'Late nights, weekends, during a site visit. A buyer who waits too long simply messages the next listing.',
  },
  {
    title: 'Good buyers get lost in the noise',
    body: 'Portals send dozens of leads a day. Without quick qualification, the serious ones get the same slow reply as the curious.',
  },
  {
    title: 'Your best people do the repetitive part',
    body: '“Budget kitna hai? Kaunsa sector?” — the same first five questions, all day, instead of closing deals.',
  },
];

const STEPS = [
  {
    photo: 'phone' as const,
    eyebrow: 'Step 1',
    title: 'It answers every enquiry, instantly',
    body: 'Day or night, in the language the buyer writes in — Hindi, English or Hinglish. Warm, polite, and always on brand.',
  },
  {
    photo: 'interior' as const,
    eyebrow: 'Step 2',
    title: 'It understands what the buyer wants',
    body: 'Budget, location, BHK, timeline, home loan — captured naturally in conversation and saved to the lead, then scored hot, warm or cold.',
  },
  {
    photo: 'keys' as const,
    eyebrow: 'Step 3',
    title: 'It puts serious buyers on your calendar',
    body: 'It suggests only your real, available inventory and lines up site visits. Your team steps in for the visit, the negotiation and the close.',
  },
];

const FEATURES = [
  {
    icon: Languages,
    title: 'Fluent in Hinglish',
    body: 'Writes like your buyers write — Roman Hinglish, Devanagari Hindi or English — and switches when they do.',
  },
  {
    icon: BadgeCheck,
    title: 'Only your verified inventory',
    body: 'Never invents a flat, a price or a discount. If nothing fits, it says so and asks what the buyer can adjust.',
  },
  {
    icon: Sparkles,
    title: 'Leads that fill themselves in',
    body: 'Every fact the buyer shares lands on the lead profile, so your salesperson starts the call already informed.',
  },
  {
    icon: UserCheck,
    title: 'Knows when to call a human',
    body: 'Discounts, legal questions, complaints — it hands the chat to your team and goes quiet.',
  },
  {
    icon: ClipboardList,
    title: 'One pipeline for the whole team',
    body: 'Assign leads, move them from new to won, and see who is handling what — with roles for owners, managers and agents.',
  },
  {
    icon: Clock3,
    title: 'Minutes to start',
    body: 'Add your listings, invite your team, and test the AI yourself in a live chat before any buyer ever sees it.',
  },
];

const TRUST = [
  {
    icon: Lock,
    title: 'Your data stays yours',
    body: 'Every business is fully isolated. Your leads and listings are never visible to, or used for, any other business.',
  },
  {
    icon: ToggleRight,
    title: 'You are always in control',
    body: 'Switch the AI off for any conversation with one click and reply yourself. It never closes or loses a deal on its own.',
  },
  {
    icon: Eye,
    title: 'Every action on record',
    body: 'A full audit trail shows who changed what — including every change the AI made to a lead, and why.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-based access',
    body: 'Owners, admins, managers, sales agents and viewers each see and do only what their role allows — enforced on the server.',
  },
];

const FAQ = [
  {
    q: 'Will it replace my sales team?',
    a: 'No. It takes the first conversation — answering, qualifying and booking the visit — so your team spends its time on visits, negotiation and closing. Your people stay the face of the deal.',
  },
  {
    q: 'Can it make up a property or promise a discount?',
    a: 'No. It is only given the listings you add, and it is instructed never to invent prices, offers, possession dates or RERA details. Requests for discounts are handed to a human.',
  },
  {
    q: 'Which languages does it speak?',
    a: 'English, Hindi and Hinglish. It mirrors the buyer: a message in Roman Hinglish gets a Hinglish reply, Devanagari gets Devanagari.',
  },
  {
    q: 'Does it work on WhatsApp?',
    a: 'Today you can test it in a live web chat inside your dashboard. The official WhatsApp Business integration is the next release, followed by voice calls.',
  },
  {
    q: 'What does it cost?',
    a: 'We are onboarding early-access businesses now and setting pricing with them. Register to start free, or request a demo and we will walk you through it.',
  },
  {
    q: 'Can we run it on our own servers?',
    a: 'It is built to be deployable on-premise for larger builders and developers who need their data in-house. Talk to us if that matters to you.',
  },
];

function GoldCta({ label = 'Get started free' }: { label?: string }) {
  return (
    <Button asChild variant="gold" size="xl" className="group">
      <Link href="/register">
        {label}
        <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
      </Link>
    </Button>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />

      <main>
        {/* 1 — Hero: audience + outcome + one action, over a 4K photograph */}
        <section className="relative isolate overflow-hidden bg-brand-deep">
          <Photo name="hero" priority className="-z-20" />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-deep via-brand-deep/85 to-brand-deep/30"
            aria-hidden
          />
          <div
            className="absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-t from-brand-deep/70 to-transparent"
            aria-hidden
          />

          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 pb-24 pt-36 sm:px-8 lg:grid-cols-[1.15fr_1fr] lg:pb-32 lg:pt-44">
            <div className="animate-rise">
              <p className="eyebrow eyebrow-inverted">AI sales employee for Indian real estate</p>
              <h1 className="mt-6 font-display text-[2.6rem] font-medium leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-[4.2rem]">
                Every enquiry answered.
                <span className="block text-gold-light">Every serious buyer on your calendar.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-relaxed text-brand-soft-2">
                An AI employee that talks to your buyers in Hindi, English and Hinglish, qualifies
                them, and books site visits — so your team spends its day closing, not chasing.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <GoldCta />
                <Button asChild variant="glass" size="xl">
                  <a href="#how-it-works">See how it works</a>
                </Button>
              </div>
              <ul className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm text-brand-soft-2">
                {[
                  'No credit card needed',
                  'Test it yourself in minutes',
                  'Switch it off any time',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <Check className="size-4 text-gold" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* The chat sits on top; the lead card it produced peeks out below, so the AI's replies stay readable. */}
            <div className="relative mx-auto w-full max-w-md animate-rise [animation-delay:150ms] md:mb-60">
              <ChatPreview className="ml-auto" />
              <LeadPreview className="absolute -bottom-64 -left-6 hidden md:block lg:-left-16" />
            </div>
          </div>
        </section>

        {/* Audience strip — "this is built for people like me" */}
        <section aria-label="Who it is for" className="border-b border-line bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-12 gap-y-4 px-5 py-8 sm:px-8 md:justify-between">
            <p className="text-sm font-semibold text-fg-muted">
              Built for India’s property businesses
            </p>
            <ul className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
              {AUDIENCES.map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 text-[15px] font-semibold text-brand"
                >
                  <Icon className="size-5 text-gold-deep" aria-hidden />
                  {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 2 — Pain: loss aversion, stated plainly */}
        <section className="bg-canvas">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[var(--shadow-lift)] sm:aspect-[4/3] lg:aspect-[4/5]">
              <Photo name="towers" sizes="(min-width: 1024px) 50vw, 100vw" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deep/90 to-transparent p-7 pt-24">
                <p className="font-display text-2xl leading-snug text-white sm:text-3xl">
                  “The buyer who messages at 11 pm has usually called someone else by morning.”
                </p>
              </div>
            </div>
            <div>
              <p className="eyebrow">The problem</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-brand sm:text-5xl">
                Slow replies quietly cost you deals.
              </h2>
              <ul className="mt-10 space-y-8">
                {PAINS.map((pain, i) => (
                  <li key={pain.title} className="flex gap-5">
                    <span className="font-display text-2xl text-gold-deep" aria-hidden>
                      0{i + 1}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-fg">{pain.title}</h3>
                      <p className="mt-1.5 leading-relaxed text-fg-muted">{pain.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* 3 — Mechanism: three steps, each with a photograph */}
        <section id="how-it-works" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">How it works</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-brand sm:text-5xl">
                From first message to site visit — without the wait.
              </h2>
            </div>
            <ol className="mt-16 grid gap-8 md:grid-cols-3">
              {STEPS.map((step) => (
                <li
                  key={step.title}
                  className="group overflow-hidden rounded-[24px] border border-line bg-white shadow-[var(--shadow-soft)] transition-shadow hover:shadow-[var(--shadow-lift)]"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <Photo
                      name={step.photo}
                      sizes="(min-width: 768px) 33vw, 100vw"
                      className="transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-7">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-attention-fg">
                      {step.eyebrow}
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-fg">{step.title}</h3>
                    <p className="mt-2.5 leading-relaxed text-fg-muted">{step.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* 4 — Proof: the actual product, on navy */}
        <section id="product" className="relative isolate scroll-mt-20 overflow-hidden bg-brand">
          <div
            className="absolute -right-40 -top-40 -z-10 size-[36rem] rounded-full bg-gold/10 blur-3xl"
            aria-hidden
          />
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.25fr] lg:items-center lg:py-32">
            <div>
              <p className="eyebrow eyebrow-inverted">The product</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl">
                See exactly what the AI learned — and act on it.
              </h2>
              <p className="mt-6 text-lg leading-relaxed text-brand-soft-2">
                Every conversation becomes a clean, scored lead in one shared pipeline. Your team
                opens a lead and already knows the budget, the sector, the BHK and when they want to
                visit.
              </p>
              <ul className="mt-8 space-y-3.5">
                {[
                  'Hot, warm and cold scoring from the conversation itself',
                  'Assign leads to agents and track every stage to “won”',
                  'Read any chat and take over with one click',
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-brand-soft-2">
                    <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-gold/20">
                      <Check className="size-3.5 text-gold-light" aria-hidden />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
              <div className="mt-10">
                <GoldCta label="Try it on your listings" />
              </div>
            </div>
            <PipelinePreview />
          </div>
        </section>

        {/* Features */}
        <section className="bg-white">
          <div className="mx-auto max-w-7xl px-5 py-24 sm:px-8 lg:py-32">
            <div className="max-w-2xl">
              <p className="eyebrow">Built for how India buys property</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-brand sm:text-5xl">
                A salesperson that never sleeps, and never oversells.
              </h2>
            </div>
            <ul className="mt-16 grid gap-px overflow-hidden rounded-[24px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map(({ icon: Icon, title, body }) => (
                <li key={title} className="bg-white p-8 transition-colors hover:bg-canvas">
                  <span className="flex size-11 items-center justify-center rounded-xl bg-brand text-gold-light">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-lg font-semibold text-fg">{title}</h3>
                  <p className="mt-2 leading-relaxed text-fg-muted">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* 5 — Trust: photo + guarantees about control and data */}
        <section id="trust" className="scroll-mt-20 bg-canvas">
          <div className="mx-auto grid max-w-7xl gap-14 px-5 py-24 sm:px-8 lg:grid-cols-2 lg:items-center lg:py-32">
            <div>
              <p className="eyebrow">Trust & security</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-brand sm:text-5xl">
                Your buyers trust you. So we built it to earn that trust.
              </h2>
              <ul className="mt-12 grid gap-8 sm:grid-cols-2">
                {TRUST.map(({ icon: Icon, title, body }) => (
                  <li key={title}>
                    <Icon className="size-6 text-gold-deep" aria-hidden />
                    <h3 className="mt-3 font-semibold text-fg">{title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-fg-muted">{body}</p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] shadow-[var(--shadow-lift)] sm:aspect-[4/3] lg:aspect-[4/5]">
              <Photo name="villa" sizes="(min-width: 1024px) 50vw, 100vw" />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl border border-white/20 bg-brand-deep/70 p-5 text-white backdrop-blur-md">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <KeyRound className="size-4 text-gold-light" aria-hidden /> You hold the keys
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-brand-soft-2">
                  The AI qualifies and schedules. Pricing, negotiation and the final word always
                  stay with your team.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Objections */}
        <section id="faq" className="scroll-mt-20 bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-24 sm:px-8 lg:grid-cols-[1fr_1.4fr] lg:py-32">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 className="mt-5 font-display text-4xl font-medium leading-tight tracking-tight text-brand sm:text-5xl">
                Straight answers.
              </h2>
              <p className="mt-5 max-w-sm leading-relaxed text-fg-muted">
                Something else on your mind? We are happy to talk it through.
              </p>
              {DEMO_REQUEST_EMAIL && (
                <Button asChild variant="secondary" size="lg" className="mt-7">
                  <a
                    href={`mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent('Question about the AI sales employee')}`}
                  >
                    <MessageCircle /> Ask us anything
                  </a>
                </Button>
              )}
            </div>
            <div className="divide-y divide-line border-y border-line">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-6 [&_summary::-webkit-details-marker]:hidden">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-6 text-lg font-semibold text-fg">
                    {q}
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
          </div>
        </section>

        {/* 6 — Final call to action */}
        <section className="relative isolate overflow-hidden bg-brand-deep">
          <Photo name="kitchen" className="-z-20" />
          <div className="absolute inset-0 -z-10 bg-brand-deep/80" aria-hidden />
          <div className="mx-auto max-w-4xl px-5 py-28 text-center sm:px-8 lg:py-36">
            <p className="eyebrow eyebrow-inverted justify-center">Early access is open</p>
            <h2 className="mt-6 font-display text-4xl font-medium leading-tight tracking-tight text-white sm:text-6xl">
              Your next buyer is messaging right now.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-brand-soft-2">
              Set up your business, add a few listings and chat with your AI employee yourself —
              before a single buyer sees it.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <GoldCta />
              {DEMO_REQUEST_EMAIL && (
                <Button asChild variant="glass" size="xl">
                  <a
                    href={`mailto:${DEMO_REQUEST_EMAIL}?subject=${encodeURIComponent('Private demo request')}`}
                  >
                    Request a private demo
                  </a>
                </Button>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-brand-deep text-brand-line">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between">
          <Logo inverted />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
            <a href="#how-it-works" className="hover:text-white">
              How it works
            </a>
            <a href="#trust" className="hover:text-white">
              Trust & security
            </a>
            <a href="#faq" className="hover:text-white">
              FAQ
            </a>
            <Link href="/login" className="hover:text-white">
              Sign in
            </Link>
          </nav>
        </div>
        <div className="mx-auto max-w-7xl border-t border-white/10 px-5 py-6 text-xs sm:px-8">
          © {new Date().getFullYear()} AI Real Estate Sales Employee · Photography from Unsplash
        </div>
      </footer>
    </div>
  );
}
