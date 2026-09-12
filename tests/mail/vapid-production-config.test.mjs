import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const sender = readFileSync('src/lib/notifications/web-push.ts', 'utf8');

test('web push still fails closed when VAPID is absent', () => {
  assert.match(sender, /WEB_PUSH_PRIVATE_KEY/);
  assert.match(sender, /vapid-not-configured/);
  assert.match(sender, /if \(!publicKey \|\| !privateKey\)/);
});
