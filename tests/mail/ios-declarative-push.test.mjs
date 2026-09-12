import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sender = readFileSync('src/lib/notifications/web-push.ts', 'utf8');
const worker = readFileSync('public/setu-mail-sw.js', 'utf8');

test('SETU Mail emits Declarative Web Push fallback for modern WebKit', () => {
  assert.match(sender, /web_push:\s*8030/);
  assert.match(sender, /app_badge:\s*String\(badgeCount\)/);
  assert.match(sender, /navigate,/);
  assert.match(sender, /silent:\s*false/);
});

test('SETU Mail worker remains backwards compatible and updates Home Screen badge', () => {
  assert.match(worker, /payload\?\.notification/);
  assert.match(worker, /showNotification\(normalized\.title/);
  assert.match(worker, /setAppBadge/);
  assert.match(worker, /SETU_MAIL_NOTIFICATION/);
});

test('push diagnostics distinguish Apple acceptance and rejection', () => {
  assert.match(sender, /\[setu-communications:push\] accepted/);
  assert.match(sender, /\[setu-communications:push\] rejected/);
  assert.match(sender, /web\.push\.apple\.com/);
});
