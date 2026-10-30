import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webhook = fs.readFileSync('src/features/integrations/interakt/webhook.ts', 'utf8');

test('initial Interakt owner is written only while all ownership fields remain empty', () => {
  assert.match(webhook, /if \(initialOwner\) \{[\s\S]*?\.update\(ownerPatch\)[\s\S]*?\.is\('setu_assigned_user_id', null\)[\s\S]*?\.is\('setu_assigned_invitation_id', null\)[\s\S]*?\.is\('setu_assigned_email', null\)/);
});

test('general webhook data refresh never includes ownerPatch', () => {
  assert.doesNotMatch(webhook, /updated_at: now,\s*\.\.\.ownerPatch/);
  assert.match(webhook, /updated_at: now,\s*\.\.\.identityPatch/);
});
