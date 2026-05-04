import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const actions = readFileSync('src/features/client-onboarding/server/actions.ts', 'utf8');
const page = readFileSync('src/app/(app)/admin/client-onboarding/page.tsx', 'utf8');
const notifications = readFileSync('src/features/client-onboarding/server/notifications.ts', 'utf8');
const publicRoute = readFileSync('src/app/api/public/client-onboarding/route.ts', 'utf8');
const envExample = readFileSync('.env.production.example', 'utf8');

test('client onboarding notification sender supports Mailtrap first', () => {
  assert.match(notifications, /sendWithMailtrap/);
  assert.match(notifications, /MAILTRAP_API_KEY/);
  assert.match(notifications, /MAILTRAP_USE_SANDBOX/);
  assert.match(notifications, /sandbox\.api\.mailtrap\.io\/api\/send/);
  assert.match(notifications, /send\.api\.mailtrap\.io\/api\/send/);
  assert.match(notifications, /SETU_EMAIL_PROVIDER/);
});

test('client onboarding notification sender remains shared between public submission and admin retry', () => {
  assert.match(notifications, /sendClientOnboardingAdminNotification/);
  assert.match(publicRoute, /sendClientOnboardingAdminNotification/);
  assert.match(actions, /resendClientOnboardingNotification/);
  assert.match(actions, /notification_status: 'sending'/);
  assert.match(actions, /notification_status: notification\.status/);
});

test('admin onboarding page exposes admin email retry action', () => {
  assert.match(page, /resendClientOnboardingNotification/);
  assert.match(page, /Notify Setu admin/);
});

test('production env example documents Mailtrap delivery controls', () => {
  assert.match(envExample, /SETU_EMAIL_PROVIDER=mailtrap/);
  assert.match(envExample, /MAILTRAP_API_KEY=/);
  assert.match(envExample, /MAILTRAP_USE_SANDBOX=false/);
  assert.match(envExample, /MAILTRAP_SANDBOX_ID=/);
});
