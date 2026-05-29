import { expect, test } from '@playwright/test';
import { requireE2ECredentials, signInToWorkspace } from './helpers/auth';

test.describe('order progression workspace', () => {
  test.beforeEach(() => requireE2ECredentials());

  test('loads the orders execution cockpit after sign in', async ({ page }) => {
    await signInToWorkspace(page, '/orders');
    await page.goto('/orders');

    await expect(page).toHaveURL(/orders/);
    await expect(page.getByText(/trade command center/i).first()).toBeVisible();
    await expect(page.getByText(/orders|execution/i).first()).toBeVisible();
  });
});
