import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sender = readFileSync('src/lib/notifications/web-push.ts', 'utf8');
const worker = readFileSync('public/setu-mail-sw.js', 'utf8');
const notifications = readFileSync('src/components/notifications/communication-notifications.tsx', 'utf8');

test('SETU Mail emits Declarative Web Push fallback for modern WebKit', () => {
  assert.match(sender, /web_push:\s*8030,\s*\n\s*app_badge:\s*String\(badgeCount\),\s*\n\s*notification:/);
  assert.match(sender, /navigate,/);
  assert.match(sender, /silent:\s*false/);
});

test('SETU Mail worker remains backwards compatible and updates Home Screen badge', () => {
  assert.match(worker, /payload\?\.notification/);
  assert.match(worker, /payload\?\.app_badge \|\| proposed\.app_badge/);
  assert.match(worker, /showNotification\(normalized\.title/);
  assert.match(worker, /setAppBadge/);
  assert.match(worker, /SETU_MAIL_NOTIFICATION/);
});

test('VAPID rotation invalidates stale device subscriptions before reporting enabled', () => {
  assert.match(notifications, /subscriptionUsesPublicKey/);
  assert.match(notifications, /subscription\.options\.applicationServerKey/);
  assert.match(notifications, /await subscription\.unsubscribe\(\)/);
  assert.match(notifications, /\.eq\('app_scope', COMMUNICATION_PUSH_SCOPE\)/);
  assert.match(notifications, /decodeApplicationServerKey\(publicKey\)/);
});

test('push diagnostics distinguish Apple acceptance and rejection', () => {
  assert.match(sender, /\[setu-communications:push\] accepted/);
  assert.match(sender, /\[setu-communications:push\] rejected/);
  assert.match(sender, /web\.push\.apple\.com/);
});
