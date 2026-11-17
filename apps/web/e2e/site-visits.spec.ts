import { expect, test } from '@playwright/test';
import { completeOnboarding, navigate, registerThroughUi, uniqueEmail } from './helpers';

/**
 * A buyer asks the AI for a visit on WhatsApp (demo mode), the team confirms a time from the
 * conversation, the buyer is told on WhatsApp, and the visit moves through the Site Visits page.
 */
test('a buyer asks to visit, the team confirms it and records the outcome', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Visit Owner',
    email: uniqueEmail('visits'),
    business: 'Visit Realty',
  });
  await completeOnboarding(page);

  await navigate(page, 'Integrations');
  await page.getByLabel('Phone number ID').fill(`5${Date.now()}`.slice(0, 15));
  await page.getByLabel('WhatsApp number buyers message').fill('98100 77777');
  await page.getByLabel('Permanent access token').fill('EAAG-visit-browser-test');
  await page.getByRole('button', { name: 'Check and connect' }).click();
  await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();

  await page.getByLabel('Buyer’s WhatsApp number').fill('97222 33445');
  await page.getByLabel('Profile name').fill('Anita Rao');
  await page.getByLabel('Message').fill('2 BHK in Noida. Can I visit on Saturday at 11am?');
  await page.getByRole('button', { name: 'Send as buyer' }).click();
  await expect(page).toHaveURL(/\/dashboard\/conversations\?id=/, { timeout: 20_000 });

  // The request shows in the conversation, ready to confirm.
  const banner = page.getByRole('status').filter({ hasText: 'Site visit requested' });
  await expect(banner).toContainText('Saturday at 11am');
  await banner.getByRole('button', { name: 'Confirm a time' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('The buyer asked for: “Saturday at 11am”');
  await dialog.getByRole('button', { name: 'Confirm visit' }).click();
  await expect(page.getByText(/Visit confirmed · buyer told on WhatsApp/)).toBeVisible();
  await expect(banner).toHaveCount(0);
  // The confirmation went to the buyer as part of the chat.
  await expect(
    page
      .getByRole('region', { name: 'Conversation with Anita Rao' })
      .getByText('Your site visit is confirmed ✅'),
  ).toBeVisible();

  await navigate(page, 'Site Visits');
  await expect(page.getByRole('heading', { name: 'Site visits' })).toBeVisible({ timeout: 20_000 });
  await page.getByRole('tab', { name: 'Upcoming' }).click();
  const card = page.getByRole('listitem').filter({ hasText: 'Anita Rao' });
  await expect(card).toContainText('Confirmed');
  await card.getByRole('button', { name: 'Cancel visit' }).click();
  await expect(page.getByText(/Marked cancelled · buyer told on WhatsApp/)).toBeVisible();

  await page.getByRole('tab', { name: 'Past' }).click();
  await expect(page.getByRole('listitem').filter({ hasText: 'Anita Rao' })).toContainText(
    'Cancelled',
  );

  // The lead page lists the visit and can book a new one.
  await page.getByRole('link', { name: 'Anita Rao' }).first().click();
  await expect(page).toHaveURL(/\/dashboard\/leads\//);
  await page.getByRole('button', { name: 'Book a visit' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Book visit' }).click();
  await expect(page.getByText(/Visit confirmed/).last()).toBeVisible();
  const visits = page.getByRole('region', { name: 'Site visits' });
  await expect(visits.getByText('Confirmed', { exact: true })).toBeVisible();
  await expect(visits.getByText('Cancelled', { exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/lead-visits.png', fullPage: true });
});
