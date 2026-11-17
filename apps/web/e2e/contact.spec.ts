import { expect, test } from '@playwright/test';

test('a prospect can request a demo from the Contact page', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Request a private demo' }).click();
  // First visit compiles the page in dev mode.
  await expect(page).toHaveURL(/\/contact$/, { timeout: 20_000 });

  const form = page.getByRole('form', { name: 'Request a demo' });
  await form.getByRole('button', { name: 'Request a demo' }).click();
  await expect(form.getByText('Enter your name')).toBeVisible();
  await expect(form.getByText('Enter your email')).toBeVisible();

  await form.getByLabel('Your name').fill('Priya Kapoor');
  await form.getByLabel('Work email').fill(`priya.${Date.now()}@example.com`);
  await form.getByLabel('Business name').fill('Kapoor Estates');
  await form.getByLabel('How can we help?').fill('We are a brokerage in Pune and want a demo.');
  await form.getByRole('button', { name: 'Request a demo' }).click();
  await expect(page.getByRole('status')).toContainText('Thank you — we have your message.');
});

test('legal pages are linked from every public page and from sign-up', async ({ page }) => {
  await page.goto('/whatsapp-ai-for-real-estate');
  const legal = page.getByRole('navigation', { name: 'Legal' });
  await legal.getByRole('link', { name: 'Privacy Policy' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '10. Grievance Officer' })).toBeVisible();

  await page.goto('/register');
  await expect(page.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute(
    'href',
    '/terms',
  );
  await expect(page.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute(
    'href',
    '/privacy',
  );
});
