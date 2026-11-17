import type { Metadata } from 'next';
import Link from 'next/link';
import { TextPage } from '@/components/marketing/legal-page';
import { Button } from '@/components/ui/button';
import { COMPANY, filled } from '@/lib/company';
import { OG_IMAGE, SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: 'About us',
  description: `Who builds ${SITE_NAME}, the AI sales agent for Indian real estate, and the principles behind it.`,
  alternates: { canonical: '/about' },
  openGraph: { url: '/about', images: [OG_IMAGE] },
};

const PRINCIPLES = [
  {
    title: 'Built for how India buys property',
    body: 'WhatsApp first, Hindi and Hinglish as naturally as English, portal leads, site visits, and prices in lakh and crore.',
  },
  {
    title: 'The AI never makes things up',
    body: 'It recommends only the listings a business enters and hands discounts, legal questions and complaints to a person.',
  },
  {
    title: 'People stay in charge',
    body: 'Every conversation is visible, the AI can be paused in one click, and every change it makes is recorded.',
  },
  {
    title: 'Security from day one',
    body: 'Each business’s data is isolated, secrets are encrypted, and we collect only what the product needs.',
  },
];

export default function AboutPage() {
  const c = COMPANY;
  const registered = [c.legalName, c.address, filled(c.gstin) ? `GSTIN ${c.gstin}` : null].filter(
    Boolean,
  );
  return (
    <TextPage
      title="About us"
      path="/about"
      intro="We build the AI sales agent for Indian real estate: software that answers every buyer in seconds, so brokers and builders spend their day closing instead of chasing."
    >
      <h2>Why we built it</h2>
      <p>
        Property enquiries arrive at all hours, on WhatsApp, in a mix of Hindi and English. Sales
        teams cannot answer them all quickly, and every slow reply is a buyer who has already
        messaged someone else. {SITE_NAME} replies instantly, asks the questions a good salesperson
        would, recommends the right homes from your own inventory and brings serious buyers to your
        team with everything already written down.
      </p>

      <h2>What we believe</h2>
      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {PRINCIPLES.map((p) => (
          <div key={p.title} className="rounded-[16px] border border-line p-5">
            <h3 className="text-base font-semibold text-fg">{p.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-fg-muted">{p.body}</p>
          </div>
        ))}
      </div>

      <h2>Company</h2>
      <p>
        {registered.map((line, i) => (
          <span key={line}>
            {i > 0 && <br />}
            {line}
          </span>
        ))}
      </p>

      <div className="mt-10 flex flex-wrap gap-3">
        <Button asChild size="lg">
          <Link href="/contact">Request a demo</Link>
        </Button>
        <Button asChild size="lg" variant="secondary">
          <Link href="/#how-it-works">See how it works</Link>
        </Button>
      </div>
    </TextPage>
  );
}
