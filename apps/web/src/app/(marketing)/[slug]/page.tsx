import { ArrowRight, Check } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_IMAGE } from '@/lib/site';
import { notFound } from 'next/navigation';
import { Breadcrumbs } from '@/components/marketing/breadcrumbs';
import { FaqList } from '@/components/marketing/faq-list';
import { Photo } from '@/components/marketing/photo';
import { SiteFooter } from '@/components/marketing/site-footer';
import { SiteHeader } from '@/components/marketing/site-header';
import { faqLd, JsonLd } from '@/components/seo/json-ld';
import { Button } from '@/components/ui/button';
import { GUIDES, SOLUTIONS, solutionBySlug } from '@/lib/marketing-content';

/** Only the slugs below exist; anything else is a 404. */
export const dynamicParams = false;

export function generateStaticParams() {
  return SOLUTIONS.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const page = solutionBySlug((await params).slug);
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: page.description,
    alternates: { canonical: `/${page.slug}` },
    openGraph: {
      title: page.title,
      description: page.description,
      url: `/${page.slug}`,
      images: [OG_IMAGE],
    },
    twitter: { card: 'summary_large_image', images: [OG_IMAGE.url] },
  };
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const page = solutionBySlug((await params).slug);
  if (!page) notFound();
  const related = page.related.map(solutionBySlug).filter((p) => p !== undefined);
  const guides = GUIDES.filter((g) => g.related.includes(page.slug));

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <JsonLd data={faqLd(page.faq)} />
      <main>
        <section className="relative isolate overflow-hidden bg-brand-deep">
          <Photo name={page.photo} priority className="-z-20" />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-brand-deep via-brand-deep/90 to-brand-deep/50"
            aria-hidden
          />
          <div className="mx-auto max-w-7xl px-5 pb-20 pt-32 sm:px-8 lg:pb-28 lg:pt-40">
            <Breadcrumbs
              inverted
              items={[
                { name: 'Home', path: '/' },
                { name: page.label, path: `/${page.slug}` },
              ]}
            />
            <p className="eyebrow eyebrow-inverted mt-8">{page.eyebrow}</p>
            <h1 className="mt-5 max-w-4xl font-display text-4xl font-medium leading-[1.08] tracking-tight text-white sm:text-6xl">
              {page.h1}
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-brand-soft-2">{page.intro}</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild variant="gold" size="xl" className="group">
                <Link href="/register">
                  Get started
                  <ArrowRight className="transition-transform group-hover:translate-x-0.5" />
                </Link>
              </Button>
              <Button asChild variant="glass" size="xl">
                <a href="#how-it-works">How it works</a>
              </Button>
            </div>
          </div>
        </section>

        <section className="bg-canvas">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight text-brand sm:text-4xl">
              {page.problem.heading}
            </h2>
            <ul className="mt-12 grid gap-8 md:grid-cols-3">
              {page.problem.points.map((point, i) => (
                <li key={point.title} className="flex gap-5">
                  <span className="font-display text-2xl text-gold-deep" aria-hidden>
                    0{i + 1}
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-fg">{point.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-fg-muted">{point.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-20 bg-white">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <p className="eyebrow">How it works</p>
            <h2 className="mt-5 max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight text-brand sm:text-4xl">
              {page.how.heading}
            </h2>
            <ol className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {page.how.steps.map((step, i) => (
                <li
                  key={step.title}
                  className="rounded-[20px] border border-line bg-white p-6 shadow-[var(--shadow-soft)]"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand text-sm font-bold text-gold-light">
                    {i + 1}
                  </span>
                  <h3 className="mt-4 text-lg font-semibold text-fg">{step.title}</h3>
                  <p className="mt-2 leading-relaxed text-fg-muted">{step.body}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section className="bg-brand">
          <div className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-28">
            <h2 className="max-w-2xl font-display text-3xl font-medium leading-tight tracking-tight text-white sm:text-4xl">
              {page.features.heading}
            </h2>
            <ul className="mt-12 grid gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
              {page.features.items.map((item) => (
                <li key={item.title} className="flex gap-3.5">
                  <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/20">
                    <Check className="size-3.5 text-gold-light" aria-hidden />
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="mt-1.5 leading-relaxed text-brand-soft-2">{item.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="bg-white">
          <div className="mx-auto grid max-w-7xl gap-12 px-5 py-20 sm:px-8 lg:grid-cols-[1fr_1.5fr] lg:py-28">
            <div>
              <p className="eyebrow">Questions</p>
              <h2 className="mt-5 font-display text-3xl font-medium leading-tight tracking-tight text-brand sm:text-4xl">
                Frequently asked questions
              </h2>
            </div>
            <FaqList items={page.faq} />
          </div>
        </section>

        {(related.length > 0 || guides.length > 0) && (
          <section className="border-t border-line bg-canvas" aria-labelledby="related-heading">
            <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
              <h2 id="related-heading" className="text-lg font-semibold text-fg">
                Related
              </h2>
              <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link
                      href={`/${r.slug}`}
                      className="block h-full rounded-[16px] border border-line bg-white p-5 shadow-[var(--shadow-soft)] transition hover:border-brand-line"
                    >
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-attention-fg">
                        Solution
                      </span>
                      <span className="mt-2 block font-semibold text-fg">{r.label}</span>
                    </Link>
                  </li>
                ))}
                {guides.map((g) => (
                  <li key={g.slug}>
                    <Link
                      href={`/guides/${g.slug}`}
                      className="block h-full rounded-[16px] border border-line bg-white p-5 shadow-[var(--shadow-soft)] transition hover:border-brand-line"
                    >
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-attention-fg">
                        Guide
                      </span>
                      <span className="mt-2 block font-semibold text-fg">{g.metaTitle}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section className="bg-brand-deep">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center sm:px-8">
            <h2 className="font-display text-3xl font-medium tracking-tight text-white sm:text-5xl">
              See it answer your buyers.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg text-brand-soft-2">
              Add a few listings and chat with your AI sales agent yourself — before a single buyer
              sees it.
            </p>
            <Button asChild variant="gold" size="xl" className="mt-9">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
