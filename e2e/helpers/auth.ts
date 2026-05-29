import { expect, type Page, test } from '@playwright/test';

const username = process.env.E2E_USERNAME ?? process.env.E2E_EMAIL ?? '';
const password = process.env.E2E_PASSWORD ?? '';

export function requireE2ECredentials() {
  test.skip(!username || !password, 'Set E2E_USERNAME and E2E_PASSWORD for authenticated E2E coverage.');
}

export async function signInToWorkspace(page: Page, next = '/dashboard') {
  await page.goto(`/client-login?next=${encodeURIComponent(next)}`);
  await expect(page.getByRole('heading', { name: /access your workspace/i })).toBeVisible();
  await page.getByLabel('Username', { exact: true }).fill(username);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByRole('button', { name: /sign in to workspace/i }).click();
  await page.waitForURL((url) => url.pathname !== '/client-login', { timeout: 30_000 });
}
