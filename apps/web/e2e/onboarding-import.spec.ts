import { expect, test } from '@playwright/test';
import { completeOnboarding, navigate, registerThroughUi, uniqueEmail } from './helpers';

/**
 * A new business fills its inventory without typing listings one by one: it uploads a spreadsheet
 * (fixing a bad row first) and also tries the sample listings.
 */
test('imports listings from a CSV and adds sample listings', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Import Owner',
    email: uniqueEmail('import'),
    business: 'Import Realty',
  });
  await completeOnboarding(page);

  // The checklist now includes connecting WhatsApp.
  await expect(page.getByRole('link', { name: 'Connect WhatsApp' })).toBeVisible();

  await navigate(page, 'Properties');
  const empty = page.getByRole('main');
  await empty.getByRole('button', { name: 'Import CSV' }).first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Required columns');

  const header = 'Title,Property type,Price,City,BHK';
  await dialog.getByLabel('CSV file').setInputFiles({
    name: 'listings.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `${header}\n2 BHK in Sector 62,Flat,62 lakh,Noida,2\nBad row,Castle,1 cr,Noida,3\n`,
    ),
  });
  await expect(dialog).toContainText('1 row needs fixing');
  await expect(dialog.getByRole('table')).toContainText('Property type');
  await expect(dialog.getByRole('button', { name: /^Import \d/ })).toHaveCount(0);

  await dialog.getByRole('button', { name: 'Choose another file' }).click();
  await dialog.getByLabel('CSV file').setInputFiles({
    name: 'listings.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from(
      `${header}\n2 BHK in Sector 62,Flat,62 lakh,Noida,2\n4 BHK villa,Villa,3.2 cr,Noida,4\n`,
    ),
  });
  await expect(dialog).toContainText('all 2 listings are ready to import');
  await dialog.getByRole('button', { name: 'Import 2 listings' }).click();
  await expect(page.getByText('2 listings imported')).toBeVisible();
  await expect(page.getByRole('heading', { name: '2 BHK in Sector 62' })).toBeVisible();
  await expect(page.getByText('₹62 lakh').first()).toBeVisible();
});

test('a new business can try the AI with sample listings', async ({ page }) => {
  await registerThroughUi(page, {
    name: 'Sample Owner',
    email: uniqueEmail('samples'),
    business: 'Sample Realty',
  });
  await completeOnboarding(page);
  await navigate(page, 'Properties');
  await page.getByRole('button', { name: 'Add sample listings' }).click();
  await expect(page.getByText('6 sample listings added')).toBeVisible();
  await expect(page.getByRole('heading', { name: /^Sample · / })).toHaveCount(6);
});
