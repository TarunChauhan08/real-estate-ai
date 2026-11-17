import { expect, test } from '@playwright/test';
import {
  completeOnboarding,
  PASSWORD,
  registerThroughUi,
  signIn,
  signOut,
  uniqueEmail,
} from './helpers';

/**
 * Account screens. Token handling and emails are covered by the API tests; here we check what a
 * person sees: the reminder banner, forgot-password, broken links, and changing a password.
 */
test('new accounts are reminded to confirm their email and can change their password', async ({
  page,
}) => {
  const email = uniqueEmail('account');
  await registerThroughUi(page, { name: 'Account Owner', email, business: 'Account Realty' });
  await completeOnboarding(page);

  const banner = page.getByRole('status').filter({ hasText: 'Confirm your email' });
  await expect(banner).toContainText(email);
  await banner.getByRole('button', { name: 'Send the link again' }).click();
  await expect(page.getByText(`Link sent to ${email}`)).toBeVisible();
  await banner.getByRole('button', { name: 'Later' }).click();
  await expect(banner).toHaveCount(0);

  await page.goto('/dashboard/settings?tab=security');
  await page.getByLabel('Current password').fill('wrong-password-1');
  await page.getByLabel('New password', { exact: true }).fill('NewPassw0rd-123');
  await page.getByLabel('Repeat new password').fill('NewPassw0rd-123');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Your current password is not correct')).toBeVisible();

  await page.getByLabel('Current password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText(/Password changed/)).toBeVisible();

  await signOut(page);
  await signIn(page, email, 'NewPassw0rd-123');
  await expect(page).toHaveURL(/\/dashboard/);
});

test('forgot password never reveals whether an account exists', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Forgot password?' }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText('Enter your email')).toBeVisible();
  await page.getByLabel('Email').fill('nobody-here@example.com');
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
  await expect(page.getByText(/If an account exists for/)).toBeVisible();
});

test('broken or used links explain what to do next', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText('This link is incomplete')).toBeVisible();

  // Opening an emailed link is a fresh page load.
  await page.goto('/login');
  await page.goto('/reset-password#token=this-token-is-not-real-0000000000');
  await expect(page).toHaveURL(/\/reset-password$/); // token removed from the address bar
  await page.getByLabel('New password', { exact: true }).fill('NewPassw0rd-123');
  await page.getByLabel('Repeat new password').fill('NewPassw0rd-123');
  await page.getByRole('button', { name: 'Save new password' }).click();
  await expect(page.getByText(/invalid or has expired/)).toBeVisible();

  await page.goto('/verify-email#token=this-token-is-not-real-0000000000');
  await expect(page.getByText('This link did not work')).toBeVisible();
});
