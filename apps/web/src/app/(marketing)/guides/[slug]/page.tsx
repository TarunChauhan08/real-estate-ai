import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_IMAGE } from '@/lib/site';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/marketing/breadcrumbs';
import { FaqList } from '@/components/marketing/faq-list';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { articleLd, faqLd, JsonLd } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { GUIDES, guideBySlug, solutionBySlug } from '@/lib/marketing-content';

export const dynamicParams = false;

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const guide = guideBySlug((await params).slug);
  if (!guide) return {};
  const path = `/guides/${guide.slug}`;
  return {
    title: { absolute: guide.metaTitle },
    description: guide.description,
    alternates: { canonical: path },
    openGraph: {
      type: 'article',
      title: guide.metaTitle,
      description: guide.description,
      url: path,
      publishedTime: guide.published,
      modifiedTime: guide.updated,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
  };
}

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const guide = guideBySlug((await params).slug);
  if (!guide) notFound();
  const path = `/guides/${guide.slug}`;
  const related = guide.related.map(solutionBySlug).filter((p) => p !== undefined);
  const otherGuides = GUIDES.filter((g) => g.slug !== guide.slug);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <JsonLd
        data={[
          articleLd({
            title: guide.title,
            description: guide.description,
            path,
            published: guide.published,
            updated: guide.updated,
          }),
          faqLd(guide.faq),
        ]}
      />
      <main>
        <header className="bg-brand-deep">
          <div className="mx-auto max-w-3xl px-5 pb-14 pt-32 sm:px-8 lg:pt-40">
            <Breadcrumbs
              inverted
              items={[
                { name: 'Home', path: '/' },
                { name: 'Guides', path: '/guides' },
                { name: guide.metaTitle, path },
              ]}
            />
            <h1 className="mt-8 font-display text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl">
              {guide.title}
            </h1>
            <p className="mt-5 text-sm text-brand-line">
              Updated{' '}
              <time dateTime={guide.updated}>{dateFormat.format(new Date(guide.updated))}</time> ·{' '}
              {guide.readingMinutes} min read
            </p>
          </div>
        </header>

        <article className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
          <p className="text-xl leading-relaxed text-fg-secondary">{guide.intro}</p>
          {guide.sections.map((section) => (
            <section key={section.heading} className="mt-12">
              <h2 className="font-display text-2xl font-medium tracking-tight text-brand sm:text-3xl">
                {section.heading}
              </h2>
              {section.paragraphs.map((p) => (
                <p key={p} className="mt-4 text-[17px] leading-relaxed text-fg-secondary">
                  {p}
                </p>
              ))}
              {section.list && (
                <ul className="mt-4 list-disc space-y-2 pl-6 text-[17px] leading-relaxed text-fg-secondary marker:text-gold-deep">
                  {section.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              )}
            </section>
          ))}

          <aside className="mt-14 rounded-[20px] bg-brand p-8 text-white">
            <p className="font-display text-2xl">Let an AI sales agent do the first reply.</p>
            <p className="mt-3 text-brand-soft-2">
              It answers every enquiry in seconds — in Hindi, English or Hinglish — and fills in the
              lead for your team.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="lg">
                <Link href="/register">Get started free</Link>
              </Button>
              {related[0] && (
                <Button asChild variant="glass" size="lg">
                  <Link href={`/${related[0].slug}`}>{related[0].label}</Link>
                </Button>
              )}
            </div>
          </aside>

          <section className="mt-16">
            <h2 className="font-display text-2xl font-medium tracking-tight text-brand">
              Frequently asked questions
            </h2>
            <div className="mt-6">
              <FaqList items={guide.faq} />
            </div>
          </section>

          <nav aria-label="More guides" className="mt-16 border-t border-line pt-10">
            <p className="text-sm font-semibold text-fg">Keep reading</p>
            <ul className="mt-4 space-y-3">
              {otherGuides.map((g) => (
                <li key={g.slug}>
                  <Link href={`/guides/${g.slug}`} className="text-brand-fg hover:underline">
                    {g.title}
                  </Link>
                </li>
              ))}
              {related.map((r) => (
                <li key={r.slug}>
                  <Link href={`/${r.slug}`} className="text-brand-fg hover:underline">
                    {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
