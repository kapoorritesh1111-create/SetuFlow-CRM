import { test, expect, devices } from '@playwright/test';
import { requireE2ECredentials, signInToWorkspace } from './helpers/auth';

// Browser-emulated mobile contract. This is NOT a replacement for physical
// iPhone Safari / installed PWA acceptance testing.
test.use({ ...devices['Pixel 7'] });

test('PWA launch and shortcuts resolve to the single authenticated mobile surface', async ({ page }) => {
  await page.goto('/manifest.json');
  const manifest = JSON.parse(await page.locator('body').innerText());
  expect(manifest.start_url).toBe('/mobile?source=pwa');
  expect(manifest.id).toBe('/dashboard'); // preserve installed app identity
  expect(manifest.shortcuts.some((shortcut: { url: string }) => shortcut.url === '/leads?quickLead=1')).toBe(true);
  expect(manifest.shortcuts.some((shortcut: { url: string }) => shortcut.url === '/mobile/notifications')).toBe(true);
});

test('signed-in mobile sales account can reach real customer and pricing workflows', async ({ page }) => {
  requireE2ECredentials();
  await signInToWorkspace(page, '/mobile');
  await page.waitForURL((url) => url.pathname === '/mobile', { timeout: 30_000 });
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Your day, in focus.' })).toBeVisible();

  const permissions = await page.request.get('/api/modules/grants');
  expect(permissions.ok(), 'signed-in mobile permissions endpoint must respond successfully').toBe(true);
  const grants = await permissions.json();
  expect(typeof grants.organizationId).toBe('string');
  expect(grants.organizationId.length).toBeGreaterThan(0);
  expect(grants.grants.some((g: { module_key: string; enabled: boolean }) => g.module_key === 'full_crm' && g.enabled),
    'Use a licensed CRM sales test user, not an unlicensed or customer production account').toBe(true);

  await expect(page.getByRole('link', { name: /Continue with customers/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Prepare a Quick Quote/ })).toBeVisible();
  await page.getByRole('link', { name: /Continue with customers/ }).click();
  await expect(page).toHaveURL(/\/leads(?:\?|$)/);
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeVisible();
  expect(await page.getByText('Mehta Foods').count()).toBe(0);

  // Verify existing quote workbench is reachable. Do not create or send
  // customer quotes in automated E2E.
  await page.goto('/quick-quote');
  await expect(page).toHaveURL(/\/quick-quote/);
  await expect(page.locator('body')).not.toContainText('Template pricing, freight basis, and quantity band applied.');
});

test('legacy standalone lead bookmarks never surface bundled mock customers', async ({ page }) => {
  requireE2ECredentials();
  await signInToWorkspace(page, '/mobile');
  await page.goto('/mobile/leads');
  await expect(page).toHaveURL(/\/leads(?:\?|$)/);
  await expect(page.getByText('Mehta Foods')).toHaveCount(0);
});
