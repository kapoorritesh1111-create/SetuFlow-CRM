import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const urlHelperSource = readFileSync(new URL('../src/lib/security/url.ts', import.meta.url), 'utf8');
const authActionsSource = readFileSync(new URL('../src/features/auth/server/actions.ts', import.meta.url), 'utf8');

test('password recovery preserves trusted Setu Flow tenant subdomains', () => {
  assert.match(urlHelperSource, /hostname\.endsWith\('\.setuflowcrm\.com'\)/);
  assert.match(urlHelperSource, /x-forwarded-host/);
  assert.match(urlHelperSource, /x-forwarded-proto/);
  assert.match(urlHelperSource, /export function buildAuthConfirmRedirect/);

  assert.match(
    authActionsSource,
    /buildAuthConfirmRedirect\('\/reset-password', headers\(\)\)/,
  );
  assert.doesNotMatch(
    authActionsSource,
    /new URL\('\/auth\/confirm',\s*(?:env\.appUrl|safeAppUrl\(env\.appUrl\))/,
  );
});

test('packaging recovery callback has the required URL shape', () => {
  const redirectTo = new URL('/auth/confirm', 'https://packaging.setuflowcrm.com');
  redirectTo.searchParams.set('next', '/reset-password');

  assert.equal(
    redirectTo.toString(),
    'https://packaging.setuflowcrm.com/auth/confirm?next=%2Freset-password',
  );
});
