import Link from 'next/link';
import { breadcrumbLd, JsonLd } from '@/components/seo/json-ld';

/** Visible breadcrumbs plus matching BreadcrumbList structured data. */
export function Breadcrumbs({
  items,
  inverted = false,
}: {
  items: Array<{ name: string; path: string }>;
  inverted?: boolean;
}) {
  return (
    <>
      <nav aria-label="Breadcrumb">
        <ol
          className={`flex flex-wrap items-center gap-1.5 text-sm ${inverted ? 'text-brand-soft-2' : 'text-fg-muted'}`}
        >
          {items.map((item, i) => (
            <li key={item.path} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden>/</span>}
              {i === items.length - 1 ? (
                <span aria-current="page" className={inverted ? 'text-white' : 'text-fg'}>
                  {item.name}
                </span>
              ) : (
                <Link href={item.path} className={inverted ? 'hover:text-white' : 'hover:text-fg'}>
                  {item.name}
                </Link>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <JsonLd data={breadcrumbLd(items)} />
    </>
  );
}
