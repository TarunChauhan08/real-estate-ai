import { expect, test } from '@playwright/test';
import { completeOnboarding, registerThroughUi, uniqueEmail } from './helpers';

test('dashboard works on a phone without horizontal scrolling', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Mobile Owner',
    email: uniqueEmail('mobile'),
    business: 'Mobile Realty',
  });
  await completeOnboarding(page);

  for (const path of [
    '/dashboard',
    '/dashboard/team',
    '/dashboard/settings',
    '/dashboard/ai-employee',
  ]) {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, `${path} overflows horizontally`).toBeLessThanOrEqual(0);
  }

  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page
    .getByRole('dialog', { name: 'Navigation' })
    .getByRole('link', { name: 'Team' })
    .click();
  await expect(page).toHaveURL(/\/dashboard\/team$/);
});
