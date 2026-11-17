/**
 * Public-site settings used for SEO: canonical URLs, sitemap, social previews and structured data.
 * Set NEXT_PUBLIC_SITE_URL to the production address (e.g. https://www.example.in) before launch;
 * every canonical link and the sitemap are built from it.
 */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(
  /\/$/,
  '',
);

export const SITE_NAME = 'AI Real Estate Sales Employee';

export const SITE_TAGLINE = 'AI sales agent for real estate in India';

export const SITE_DESCRIPTION =
  'An AI sales agent for Indian real estate that answers every property enquiry on WhatsApp and web in Hindi, English and Hinglish, qualifies buyers from your own listings and lines up site visits — for brokers, builders and developers.';

/** Optional Google Search Console verification token (the content of its meta tag). */
export const GOOGLE_SITE_VERIFICATION =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined;

export const absoluteUrl = (path: string): string =>
  `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Social preview image. Listed explicitly on every page because a page's own `openGraph` metadata
 * replaces the inherited one, image included.
 */
export const OG_IMAGE = {
  url: '/opengraph-image',
  width: 1200,
  height: 630,
  alt: `${SITE_NAME} — AI sales agent for real estate in India`,
};
