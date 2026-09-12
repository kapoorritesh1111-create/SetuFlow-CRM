import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');
const browserClient = read('src/lib/supabase/browser.ts');
const middleware = read('middleware.ts');
const shell = read('src/components/layout/mail-product-shell.tsx');
const push = read('src/lib/notifications/web-push.ts');
const communications = read('src/lib/notifications/communication-notification-service.ts');
const serviceWorker = read('public/sw.js');

test('SETU Mail relies on persistent Supabase SSR cookie sessions and refreshes them on app activity', () => {
  assert.match(browserClient, /createBrowserClient as createSupabaseBrowserClient/);
  assert.match(middleware, /createServerClient/);
  assert.match(middleware, /supabase\.auth\.getUser\(\)/);
  assert.match(middleware, /response\.cookies\.set/);
  assert.match(shell, /setInterval\(loadAccess,30000\)/);
  assert.match(shell, /window\.addEventListener\('focus',focus\)/);
  assert.match(shell, /\/api\/mail\/active-mailbox/);
});

test('communication pushes are deliverable by the service worker even when the app UI is not open', () => {
  assert.match(serviceWorker, /self\.addEventListener\('push'/);
  assert.match(serviceWorker, /self\.registration\.showNotification/);
  assert.match(serviceWorker, /self\.clients\.openWindow/);
  assert.match(push, /webpush\.sendNotification/);
  assert.match(communications, /sendWebPushToUsers/);
});

test('SETU Mail communication pushes use SETU Mail app branding without replacing generic CRM alerts', () => {
  assert.match(communications, /SETU_MAIL_PUSH_ICON = '\/icons\/setu-mail-192\.png'/);
  assert.match(communications, /icon: SETU_MAIL_PUSH_ICON/);
  assert.match(serviceWorker, /const icon = payload\.icon \|\| '\/icons\/icon-192\.png'/);
  assert.match(serviceWorker, /const badge = payload\.badge \|\| icon/);
});
