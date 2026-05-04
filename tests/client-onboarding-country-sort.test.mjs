import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const provisioning = readFileSync('src/features/client-onboarding/server/provisioning.ts', 'utf8');

test('client onboarding country seed uses unique sequential fallback-market ordering', () => {
  assert.match(provisioning, /sort_order:\s*index \+ 1/);
  assert.doesNotMatch(provisioning, /sort_order:\s*country\.sort_order \?\?/);
  assert.match(provisioning, /unique \(market_id, sort_order\)/i);
});
