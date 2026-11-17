import { Breadcrumbs } from './breadcrumbs';
import { SiteFooter } from './site-footer';
import { SiteHeader } from './site-header';

const dateFormat = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

/** Shared layout for About, Contact, Privacy and Terms: readable width, navy heading band. */
export function TextPage({
  title,
  intro,
  path,
  updated,
  children,
}: {
  title: string;
  intro?: string;
  path: string;
  updated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <main>
        <header className="bg-brand-deep">
          <div className="mx-auto max-w-3xl px-5 pb-14 pt-32 sm:px-8 lg:pt-40">
            <Breadcrumbs
              inverted
              items={[
                { name: 'Home', path: '/' },
                { name: title, path },
              ]}
            />
            <h1 className="mt-8 font-display text-4xl font-medium leading-tight tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            {intro && <p className="mt-5 text-lg leading-relaxed text-brand-soft-2">{intro}</p>}
            {updated && (
              <p className="mt-4 text-sm text-brand-line">
                Effective <time dateTime={updated}>{dateFormat.format(new Date(updated))}</time>
              </p>
            )}
          </div>
        </header>
        <div className="prose-legal mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">{children}</div>
      </main>
      <SiteFooter />
    </div>
  );
}
