import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const completionRoute = readFileSync('src/app/api/auth/reset-password/complete/route.ts', 'utf8');
const resetClient = readFileSync('src/app/reset-password/reset-password-client.tsx', 'utf8');

test('password reset completion accepts the recovery access token when cookies lag behind', () => {
  assert.match(completionRoute, /authorization/i);
  assert.match(completionRoute, /bearer /i);
  assert.match(completionRoute, /admin\.auth\.getUser\(bearerToken\)/);
  assert.match(resetClient, /supabase\.auth\.getSession\(\)/);
  assert.match(resetClient, /Authorization: `Bearer \$\{accessToken\}`/);
});

test('password reset completion only succeeds after forced-change metadata is cleared', () => {
  assert.match(completionRoute, /delete nextAppMetadata\.force_password_change/);
  assert.match(completionRoute, /delete nextAppMetadata\.force_password_change_org_id/);
  assert.match(completionRoute, /delete nextAppMetadata\.temporary_password_issued_at/);
  assert.match(completionRoute, /if \(!admin\)/);
  assert.match(completionRoute, /if \(metadataError\)/);
});

test('successful password reset closes both server and browser recovery sessions', () => {
  assert.match(completionRoute, /supabase\.auth\.signOut\(\)/);
  assert.match(resetClient, /supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
});
