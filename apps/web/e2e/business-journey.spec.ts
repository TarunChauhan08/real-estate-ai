import { expect, test } from '@playwright/test';
import {
  completeOnboarding,
  navigate,
  registerThroughUi,
  signIn,
  signOut,
  uniqueEmail,
} from './helpers';

test.describe('Owner journey', () => {
  test('register → onboarding → dashboard → settings → logout → login', async ({ page }) => {
    const email = uniqueEmail('owner');
    await registerThroughUi(page, { name: 'Asha Verma', email, business: 'Noida Homes Brokerage' });
    await completeOnboarding(page);

    // Dashboard shows real account data and honest placeholders.
    await expect(page.getByRole('heading', { name: 'Welcome, Asha' })).toBeVisible();
    await expect(page.getByRole('banner').getByText('Noida Homes Brokerage')).toBeVisible();
    await expect(
      page.getByText('3 of 5 steps complete').or(page.getByText('2 of 5 steps complete')),
    ).toBeVisible();
    await expect(page.getByText('Not configured, not active')).toBeVisible();
    await expect(page.getByText('Not configured').first()).toBeVisible();

    // Future modules are visibly unavailable, not links.
    await expect(
      page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Leads' }),
    ).toHaveCount(0);

    // Update the business profile from Settings.
    await navigate(page, 'Settings');
    await page.getByLabel('Phone').fill('+91 98765 43210');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Business profile saved')).toBeVisible();

    await page.getByRole('tab', { name: 'Preferences' }).click();
    await expect(page.getByLabel('Preferred language')).toHaveValue('hinglish');

    await signOut(page);
    // A signed-out user cannot reach the dashboard.
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);

    await signIn(page, email);
    await expect(page).toHaveURL(/\/dashboard$/);
  });

  test('shows a clear error for wrong credentials', async ({ page }) => {
    await signIn(page, uniqueEmail('nobody'), 'Wr0ng-password');
    await expect(page.getByText('Invalid email or password')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('validates the registration form before submitting', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Enter your full name')).toBeVisible();
    await expect(page.getByText('Accept the terms to create your account')).toBeVisible();
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page.getByText('Use at least 10 characters')).toBeVisible();
    await expect(page).toHaveURL(/\/register$/);
  });

  test('restores the session after a full page reload', async ({ page }) => {
    await registerThroughUi(page, {
      name: 'Reload Owner',
      email: uniqueEmail('reload'),
      business: 'Reload Realty',
    });
    await completeOnboarding(page);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Welcome, Reload' })).toBeVisible();
  });
});
