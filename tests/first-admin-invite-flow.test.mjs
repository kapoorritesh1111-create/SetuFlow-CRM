import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actions = readFileSync('src/features/client-onboarding/server/actions.ts', 'utf8');
const adminActions = readFileSync('src/features/admin/server/actions.ts', 'utf8');
const notifications = readFileSync('src/features/client-onboarding/server/notifications.ts', 'utf8');
const provisioning = readFileSync('src/features/client-onboarding/server/provisioning.ts', 'utf8');
const page = readFileSync('src/app/(app)/admin/client-onboarding/page.tsx', 'utf8');
const invitePage = readFileSync('src/app/invite/[token]/page.tsx', 'utf8');

test('client onboarding exposes a Setu-admin action to email the first admin invite', () => {
  assert.match(actions, /sendFirstAdminInviteFromOnboardingRequest/);
  assert.match(actions, /sendFirstAdminInviteEmail/);
  assert.match(page, /Send first admin invite/);
  assert.match(page, /Notify Setu admin/);
});

test('first admin invite email uses secure tenant invite link and account creation flow', () => {
  assert.match(notifications, /Your Setu Flow workspace is ready/);
  assert.match(notifications, /Create account and accept invite/);
  assert.match(provisioning, /https:\/\/\$\{input\.workspaceDomain\}\/invite/);
  assert.match(provisioning, /provider: 'email_pending'/);
  assert.match(invitePage, /Create account and accept/);
  assert.match(adminActions, /admin\.auth\.admin\.createUser/);
  assert.match(adminActions, /app_finalize_invitation_acceptance_tx/);
});
