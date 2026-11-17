import type { MetadataRoute } from 'next';
import { GUIDES, SOLUTIONS } from '@/lib/marketing-content';
import { absoluteUrl } from '@/lib/site';

/** Every public page, so search engines find new pages without waiting for links. */
export default function sitemap(): MetadataRoute.Sitemap {
  const latestGuide = GUIDES.map((g) => g.updated)
    .sort()
    .at(-1);
  return [
    { url: absoluteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    ...SOLUTIONS.map((s) => ({
      url: absoluteUrl(`/${s.slug}`),
      changeFrequency: 'monthly' as const,
      priority: 0.9,
    })),
    {
      url: absoluteUrl('/guides'),
      lastModified: latestGuide,
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    ...GUIDES.map((g) => ({
      url: absoluteUrl(`/guides/${g.slug}`),
      lastModified: g.updated,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
    { url: absoluteUrl('/register'), changeFrequency: 'yearly', priority: 0.5 },
  ];
}
