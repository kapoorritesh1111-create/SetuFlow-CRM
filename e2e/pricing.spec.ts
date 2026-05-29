import { expect, test } from '@playwright/test';
import { requireE2ECredentials, signInToWorkspace } from './helpers/auth';

test.describe('pricing desk', () => {
  test.beforeEach(() => requireE2ECredentials());

  test('loads the pricing desk after sign in', async ({ page }) => {
    await signInToWorkspace(page, '/quotes');

    await expect(page).toHaveURL(/quotes/);
    await expect(page.getByText(/trade command center/i).first()).toBeVisible();
  });
});
