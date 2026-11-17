import { expect, test } from '@playwright/test';

/**
 * Guards what search engines rely on: crawl rules, the sitemap, one H1 and a unique title per
 * public page, canonical links, structured data, and the private app staying out of the index.
 */
const PUBLIC_PAGES = [
  '/',
  '/whatsapp-ai-for-real-estate',
  '/ai-for-real-estate-builders-developers',
  '/ai-for-real-estate-brokers',
  '/real-estate-lead-management',
  '/hindi-hinglish-ai-for-real-estate',
  '/guides',
  '/guides/how-to-respond-to-property-portal-leads',
  '/guides/whatsapp-24-hour-rule-for-real-estate',
  '/guides/questions-to-qualify-property-buyers',
];

test('robots.txt allows the site, blocks the app and points to the sitemap', async ({
  request,
}) => {
  const robots = await (await request.get('/robots.txt')).text();
  expect(robots).toContain('Allow: /');
  expect(robots).toContain('Disallow: /dashboard');
  expect(robots).toMatch(/Sitemap: .*\/sitemap\.xml/);
});

test('the sitemap lists every public page', async ({ request }) => {
  const xml = await (await request.get('/sitemap.xml')).text();
  for (const path of PUBLIC_PAGES) {
    expect(xml).toMatch(new RegExp(`<loc>[^<]*${path === '/' ? '/' : path}</loc>`));
  }
});

test('every public page has one H1, a unique title, a description, a canonical and structured data', async ({
  page,
}) => {
  const titles = new Set<string>();
  for (const path of PUBLIC_PAGES) {
    await page.goto(path);
    await expect(page.locator('h1')).toHaveCount(1);
    const title = await page.title();
    expect(title.length, `${path} title`).toBeGreaterThan(20);
    expect(title.length, `${path} title`).toBeLessThanOrEqual(65);
    expect(titles.has(title), `${path} duplicates a title`).toBe(false);
    titles.add(title);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description?.length ?? 0, `${path} description`).toBeGreaterThan(70);
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /opengraph-image/,
    );
    const ld = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(ld.length, `${path} structured data`).toBeGreaterThan(0);
    for (const block of ld) expect(() => JSON.parse(block)).not.toThrow();
  }
});

test('visitors can reach every solution page from the home page', async ({ page }) => {
  await page.goto('/');
  const solutions = page.locator('#solutions');
  await solutions.getByRole('link', { name: /WhatsApp AI for real estate/ }).click();
  await expect(page).toHaveURL(/\/whatsapp-ai-for-real-estate$/);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('WhatsApp AI');
  await page
    .getByRole('navigation', { name: 'Breadcrumb' })
    .getByRole('link', { name: 'Home' })
    .click();
  await expect(page).toHaveURL(/\/$/);
});

test('the signed-in app is never indexed and unknown pages are real 404s', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  const res = await page.goto('/this-page-does-not-exist');
  expect(res?.status()).toBe(404);
});
