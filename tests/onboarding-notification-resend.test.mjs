import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actions = readFileSync('src/features/client-onboarding/server/actions.ts', 'utf8');
const page = readFileSync('src/app/(app)/admin/client-onboarding/page.tsx', 'utf8');
const notifications = readFileSync('src/features/client-onboarding/server/notifications.ts', 'utf8');
const publicRoute = readFileSync('src/app/api/public/client-onboarding/route.ts', 'utf8');

test('client onboarding notification sender is shared between public submission and admin resend', () => {
  assert.match(notifications, /sendClientOnboardingAdminNotification/);
  assert.match(publicRoute, /sendClientOnboardingAdminNotification/);
  assert.match(actions, /resendClientOnboardingNotification/);
  assert.match(actions, /notification_status: 'sending'/);
  assert.match(actions, /notification_status: notification\.status/);
});

test('admin onboarding page exposes resend admin email action', () => {
  assert.match(page, /resendClientOnboardingNotification/);
  assert.match(page, /Resend admin email/);
});
