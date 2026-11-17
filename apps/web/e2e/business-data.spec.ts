import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { completeOnboarding, PASSWORD, registerThroughUi, uniqueEmail } from './helpers';

test('an owner exports the data, schedules deletion and cancels it', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Data Owner',
    email: uniqueEmail('data'),
    business: 'Data Realty',
  });
  await completeOnboarding(page);
  await page.goto('/dashboard/settings?tab=data');

  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download all data' }).click({ timeout: 20_000 });
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^data-realty.*-data-\d{4}-\d{2}-\d{2}\.json$/);
  const exported = JSON.parse(readFileSync((await download.path())!, 'utf8'));
  expect(exported).toMatchObject({
    format: 'rea-business-export/1',
    business: { name: 'Data Realty' },
  });

  await page.getByRole('button', { name: 'Delete business…' }).click();
  const dialog = page.getByRole('dialog');
  const confirm = dialog.getByRole('button', { name: 'Schedule deletion' });
  await dialog.getByLabel('Type “Data Realty” to confirm').fill('Data realty');
  await dialog.getByLabel('Your password').fill(PASSWORD);
  await expect(confirm).toBeDisabled();
  await dialog.getByLabel('Type “Data Realty” to confirm').fill('Data Realty');
  await dialog.getByLabel('Your password').fill('wrong-password-1');
  await confirm.click();
  await expect(dialog).toContainText('Password is incorrect');
  await dialog.getByLabel('Your password').fill(PASSWORD);
  await confirm.click();
  await expect(dialog).toHaveCount(0);

  const banner = page.getByRole('alert').filter({ hasText: 'will be deleted permanently' });
  await expect(banner).toBeVisible();
  await expect(page.getByRole('region', { name: 'Delete business' })).toContainText(
    'Scheduled for deletion on',
  );

  await page.getByRole('button', { name: 'Cancel deletion' }).click();
  await expect(banner).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Delete business…' })).toBeVisible();
});
