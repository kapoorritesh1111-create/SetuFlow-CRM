import { expect, test } from '@playwright/test';
import { requireE2ECredentials, signInToWorkspace } from './helpers/auth';

test.describe('workspace login', () => {
  test.beforeEach(() => requireE2ECredentials());

  test('signs in from client login and lands in the app shell', async ({ page }) => {
    await signInToWorkspace(page);

    await expect(page).toHaveURL(/\/dashboard|\/leads|\/orders|\/tasks|\/quotes/);
    await expect(page.getByText(/trade command center/i).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /leads/i }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /orders/i }).first()).toBeVisible();
  });
});
