import { COMPANY, filled } from '@/lib/company';
import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

type Json = Record<string, unknown>;

/**
 * Structured data (schema.org JSON-LD) so search engines understand what each page is:
 * the organisation, the software, FAQs and breadcrumbs. `<` is escaped so content can never
 * close the script tag.
 */
export function JsonLd({ data }: { data: Json | Json[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export const organizationLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl('/icon.svg'),
  areaServed: { '@type': 'Country', name: 'India' },
  // Only real details are published; [placeholders] are left out.
  ...(filled(COMPANY.legalName) ? { legalName: COMPANY.legalName } : {}),
  ...(filled(COMPANY.email)
    ? {
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'sales',
          email: COMPANY.email,
          ...(filled(COMPANY.phone) ? { telephone: COMPANY.phone } : {}),
          areaServed: 'IN',
          availableLanguage: ['English', 'Hindi'],
        },
      }
    : {}),
});

export const websiteLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  inLanguage: 'en-IN',
  publisher: { '@id': `${SITE_URL}/#organization` },
});

export const softwareLd = (): Json => ({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: SITE_NAME,
  url: SITE_URL,
  description: SITE_DESCRIPTION,
  applicationCategory: 'BusinessApplication',
  applicationSubCategory: 'Real estate CRM and AI sales assistant',
  operatingSystem: 'Web browser',
  inLanguage: ['en-IN', 'hi-IN'],
  availableLanguage: ['English', 'Hindi', 'Hinglish'],
  areaServed: { '@type': 'Country', name: 'India' },
  publisher: { '@id': `${SITE_URL}/#organization` },
});

export const faqLd = (faq: Array<{ q: string; a: string }>): Json => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faq.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
});

export const breadcrumbLd = (items: Array<{ name: string; path: string }>): Json => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: absoluteUrl(item.path),
  })),
});

export const articleLd = (input: {
  title: string;
  description: string;
  path: string;
  published: string;
  updated: string;
}): Json => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: input.title,
  description: input.description,
  mainEntityOfPage: absoluteUrl(input.path),
  datePublished: input.published,
  dateModified: input.updated,
  inLanguage: 'en-IN',
  author: { '@id': `${SITE_URL}/#organization` },
  publisher: { '@id': `${SITE_URL}/#organization` },
  image: absoluteUrl('/opengraph-image'),
});
