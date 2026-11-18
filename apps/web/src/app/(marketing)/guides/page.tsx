import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_IMAGE } from '@/lib/site';
import { Breadcrumbs } from '@/components/marketing/breadcrumbs';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { GUIDES } from '@/lib/marketing-content';

const TITLE = 'Real Estate Sales Guides for Indian Brokers & Builders';
const DESCRIPTION =
  'Practical guides on answering portal leads, qualifying property buyers and using WhatsApp for real estate sales in India.';

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: '/guides' },
  openGraph: { title: TITLE, description: DESCRIPTION, url: '/guides', images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
};

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <section className="bg-brand-deep">
          <div className="mx-auto max-w-7xl px-5 pb-16 pt-32 sm:px-8 lg:pt-40">
            <Breadcrumbs
              inverted
              items={[
                { name: 'Home', path: '/' },
                { name: 'Guides', path: '/guides' },
              ]}
            />
            <h1 className="mt-8 max-w-3xl font-display text-4xl font-bold leading-tight text-white sm:text-6xl">
              Real estate sales guides
            </h1>
            <p className="mt-5 max-w-2xl text-lg text-brand-soft-2">{DESCRIPTION}</p>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 lg:py-24">
          <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {GUIDES.map((guide) => (
              <li key={guide.slug}>
                <article className="flex h-full flex-col rounded-[20px] border border-line bg-white p-7 shadow-[var(--shadow-soft)] transition hover:shadow-[var(--shadow-lift)]">
                  <p className="text-xs text-fg-muted">
                    <time dateTime={guide.updated}>
                      {dateFormat.format(new Date(guide.updated))}
                    </time>{' '}
                    · {guide.readingMinutes} min read
                  </p>
                  <h2 className="mt-3 text-xl font-semibold leading-snug text-fg">
                    <Link href={`/guides/${guide.slug}`} className="hover:text-brand-fg">
                      {guide.title}
                    </Link>
                  </h2>
                  <p className="mt-3 flex-1 leading-relaxed text-fg-muted">{guide.description}</p>
                  <Link
                    href={`/guides/${guide.slug}`}
                    className="mt-5 text-sm font-semibold text-brand-fg hover:underline"
                    aria-label={`Read: ${guide.title}`}
                  >
                    Read the guide →
                  </Link>
                </article>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
