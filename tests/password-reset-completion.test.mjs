import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const completionRoute = readFileSync('src/app/api/auth/reset-password/complete/route.ts', 'utf8');
const resetClient = readFileSync('src/app/reset-password/reset-password-client.tsx', 'utf8');

test('password reset completion prefers the explicit recovery access token over stale cookies', () => {
  assert.match(completionRoute, /authorization/i);
  assert.match(completionRoute, /bearer /i);
  assert.match(completionRoute, /const bearerToken = getBearerToken\(request\)/);
  assert.match(completionRoute, /admin\.auth\.getUser\(bearerToken\)/);
  assert.ok(
    completionRoute.indexOf('const bearerToken = getBearerToken(request)') <
      completionRoute.indexOf('const cookieUserResult = await supabase.auth.getUser()'),
    'bearer identity must be resolved before cookie identity',
  );
  assert.match(resetClient, /supabase\.auth\.getSession\(\)/);
  assert.match(resetClient, /Authorization: `Bearer \$\{accessToken\}`/);
});

test('password reset completion explicitly clears and verifies forced-change metadata', () => {
  assert.match(completionRoute, /force_password_change:\s*null/);
  assert.match(completionRoute, /force_password_change_org_id:\s*null/);
  assert.match(completionRoute, /temporary_password_issued_at:\s*null/);
  assert.match(completionRoute, /admin\.auth\.admin\.getUserById\(user\.id\)/);
  assert.match(completionRoute, /refreshedMetadata\.force_password_change === true/);
  assert.match(completionRoute, /if \(!admin\)/);
  assert.match(completionRoute, /if \(metadataError\)/);
});

test('successful password reset closes both server and browser recovery sessions', () => {
  assert.match(completionRoute, /supabase\.auth\.signOut\(\)/);
  assert.match(resetClient, /supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
});
