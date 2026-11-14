import { expect, test } from '@playwright/test';
import {
  PASSWORD,
  completeOnboarding,
  navigate,
  registerThroughUi,
  signOut,
  uniqueEmail,
} from './helpers';

test('owner invites an agent, the agent joins, the owner changes their role and disables them', async ({
  page,
  context,
}) => {
  const ownerEmail = uniqueEmail('owner');
  const agentEmail = uniqueEmail('agent');
  await registerThroughUi(page, { name: 'Team Owner', email: ownerEmail, business: 'Team Realty' });
  await completeOnboarding(page);

  await navigate(page, 'Team');
  await page.getByRole('button', { name: 'Invite member' }).click();
  await page.getByLabel('Email').fill(agentEmail);
  await page.getByLabel('Role').selectOption('SALES_AGENT');
  await page.getByRole('button', { name: 'Create invitation' }).click();

  // Delivery is reported honestly; the development link is shown instead.
  await expect(page.getByText('No email was sent')).toBeVisible();
  const link = await page.getByLabel('Invitation link', { exact: true }).inputValue();
  expect(link).toContain('/accept-invitation#token=');
  await page.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByText(agentEmail)).toBeVisible();
  await expect(page.getByText('Pending')).toBeVisible();

  // The invitee accepts in a separate browser session.
  const invitee = await context.browser()!.newContext();
  const agentPage = await invitee.newPage();
  await agentPage.goto(link);
  await expect(agentPage.getByRole('heading', { name: 'Join Team Realty' })).toBeVisible();
  await expect(agentPage).not.toHaveURL(/token=/); // token removed from the address bar
  await agentPage.getByLabel('Your name').fill('Arjun Mehta');
  await agentPage.getByLabel('Create a password').fill(PASSWORD);
  await agentPage.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(agentPage).toHaveURL(/\/dashboard$/);
  await expect(agentPage.getByRole('banner').getByText('Sales agent')).toBeVisible();

  // A sales agent sees the team read-only: no invite button, no role controls.
  await navigate(agentPage, 'Team');
  await expect(agentPage.getByRole('heading', { name: 'Team' })).toBeVisible();
  await expect(agentPage.getByRole('button', { name: 'Invite member' })).toHaveCount(0);
  await expect(agentPage.getByRole('combobox', { name: /Role for/ })).toHaveCount(0);

  // Owner promotes the agent to manager, then disables them.
  await page.reload();
  const role = page.getByRole('combobox', { name: 'Role for Arjun Mehta' }).first();
  await role.selectOption('MANAGER');
  await expect(page.getByText('Arjun Mehta is now Manager')).toBeVisible();
  await page
    .getByRole('row', { name: /Arjun Mehta/ })
    .getByRole('button', { name: 'Disable' })
    .click();
  await expect(page.getByText('Arjun Mehta is suspended')).toBeVisible();

  // The disabled member loses access on their next request.
  await agentPage.reload();
  await expect(agentPage.getByText('No active business')).toBeVisible();

  await signOut(page);
  await invitee.close();
});
