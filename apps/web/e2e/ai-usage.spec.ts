import { expect, test } from '@playwright/test';
import { completeOnboarding, navigate, registerThroughUi, uniqueEmail } from './helpers';

/** After a test chat, the AI Employee page shows the reply in its usage summary. */
test('the AI Employee page reports usage after a test chat', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Usage Owner',
    email: uniqueEmail('usage'),
    business: 'Usage Realty',
  });
  await completeOnboarding(page);

  await navigate(page, 'AI Employee');
  const usage = page.getByRole('region', { name: 'AI usage' });
  await expect(usage).toContainText('AI replies', { timeout: 20_000 });
  await expect(usage.getByRole('definition').first()).toHaveText('0');

  await page.getByLabel('Buyer’s mobile number').fill('98111 44556');
  await page.getByRole('button', { name: 'Start test chat' }).click();
  await expect(page).toHaveURL(/\/dashboard\/conversations\?id=/, { timeout: 20_000 });
  await page.getByLabel('Message').fill('Mujhe Noida mein 2 BHK chahiye, budget 70 lakh');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByText(/Aapki requirement|Namaste/).first()).toBeVisible({
    timeout: 20_000,
  });

  await navigate(page, 'AI Employee');
  await expect(usage.getByRole('definition').first()).toHaveText('1');
  await expect(usage).toContainText('Hinglish 100%');
  await usage.getByLabel('Period').selectOption('7');
  await expect(
    usage.getByRole('table', { name: 'AI replies per day' }).getByRole('row'),
  ).toHaveCount(8);
});
