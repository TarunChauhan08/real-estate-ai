import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Str0ng-Passw0rd!';
export const uniqueEmail = (prefix: string) =>
  `${prefix}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;

/** Registers a business through the UI and lands on onboarding. */
export async function registerThroughUi(
  page: Page,
  opts: { name: string; email: string; business: string },
) {
  await page.goto('/register');
  await page.getByLabel('Your name').fill(opts.name);
  await page.getByLabel('Business email').fill(opts.email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
  await page.getByLabel('Business name').fill(opts.business);
  await page.getByLabel('Business type').selectOption('BROKERAGE');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

export async function completeOnboarding(page: Page) {
  await expect(page.getByLabel('Business name')).not.toHaveValue('');
  await page.getByLabel('City').fill('Noida');
  await page.getByLabel('State').selectOption('Uttar Pradesh');
  await page.getByLabel('Preferred language').selectOption('hinglish');
  await page.getByRole('button', { name: 'Save and continue' }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
}

export async function signIn(page: Page, email: string, password = PASSWORD) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Account menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login/);
}

/** Clicks an entry in the main sidebar navigation. */
export async function navigate(page: Page, label: string) {
  await page
    .getByRole('navigation', { name: 'Main' })
    .getByRole('link', { name: label, exact: true })
    .click();
}
