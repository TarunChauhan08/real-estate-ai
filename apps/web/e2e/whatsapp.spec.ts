import { expect, test } from '@playwright/test';
import { completeOnboarding, navigate, registerThroughUi, uniqueEmail } from './helpers';

/**
 * Runs against the API's demo WhatsApp provider (the default without Meta credentials):
 * the simulator sends a pretend buyer message through the real pipeline.
 */
test('owner connects WhatsApp, a buyer writes, the AI replies and the team takes over', async ({
  page,
}) => {
  await registerThroughUi(page, {
    name: 'WA Owner',
    email: uniqueEmail('wa-owner'),
    business: 'WhatsApp Realty',
  });
  await completeOnboarding(page);

  await navigate(page, 'Integrations');
  await expect(page.getByRole('heading', { name: 'Integrations' })).toBeVisible();
  await expect(page.getByText('Not connected')).toBeVisible();
  await expect(page.getByText('Demo mode')).toBeVisible();

  // Field validation happens before anything is sent.
  await page.getByRole('button', { name: 'Check and connect' }).click();
  await expect(page.getByText(/Digits only/)).toBeVisible();

  const phoneNumberId = `1${Date.now()}`.slice(0, 15);
  await page.getByLabel('Phone number ID').fill(phoneNumberId);
  await page.getByLabel('WhatsApp number buyers message').fill('98100 12345');
  await page.getByLabel('Permanent access token').fill('EAAG-demo-token-for-browser-test');
  await page.getByRole('button', { name: 'Check and connect' }).click();
  await expect(page.getByText('+919810012345')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Disconnect' })).toBeVisible();
  // The token is never shown back.
  await expect(page.getByText('EAAG-demo-token-for-browser-test')).toHaveCount(0);

  // A buyer messages the business on WhatsApp (simulated).
  await page.getByLabel('Buyer’s WhatsApp number').fill('97111 22334');
  await page.getByLabel('Profile name').fill('Kavya Singh');
  await page.getByRole('button', { name: 'Send as buyer' }).click();

  // First visit compiles the page in dev mode, so allow a little longer.
  await expect(page).toHaveURL(/\/dashboard\/conversations\?id=/, { timeout: 20_000 });
  const thread = page.getByRole('region', { name: 'Conversation with Kavya Singh' });
  await expect(thread.getByText('+919711122334 · WhatsApp')).toBeVisible();
  await expect(thread.getByText(/reply window \d+h left/)).toBeVisible();
  await expect(thread.getByText('AI:')).toBeVisible();
  await expect(thread.getByLabel('Sent').first()).toBeVisible();

  // The team pauses the AI and replies on WhatsApp themselves.
  await thread.getByRole('switch', { name: /AI replying/ }).click();
  await expect(thread.getByRole('switch', { name: /AI paused/ })).toBeVisible();
  await thread.getByLabel('Message').fill('Hi Kavya, Rohan here. Sharing 2 options shortly.');
  await thread.getByRole('button', { name: 'Send' }).click();
  await expect(thread.getByText('Hi Kavya, Rohan here. Sharing 2 options shortly.')).toBeVisible();
  await expect(thread.getByText('Team ·').last()).toBeVisible();

  // The new lead came in from WhatsApp.
  await navigate(page, 'Leads');
  await expect(page).toHaveURL(/\/dashboard\/leads$/);
  await expect(page.getByRole('link', { name: 'Kavya Singh', exact: true })).toBeVisible();
});
