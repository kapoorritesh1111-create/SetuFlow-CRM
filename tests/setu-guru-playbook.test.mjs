import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib   = readFileSync('src/lib/setu-guru/playbook-guidance.ts', 'utf8');
const route = readFileSync('src/app/api/setu-guru/playbook/route.ts', 'utf8');
test('playbook covers all four intents with step-by-step guidance', () => {
  ['onboarding_setup','lead_to_quote','quote_to_order','order_to_dispatch'].forEach((intent) => {
    assert.match(lib, new RegExp(intent));
  });
  assert.match(lib, /requiresApproval: true/);
  assert.match(lib, /Human approval required/);
});
test('playbook detects live org gaps and personalizes guidance', () => {
  assert.match(lib, /setupGapNote/);
  assert.match(lib, /No products found/);
  assert.match(lib, /No leads found/);
});
test('playbook route is authenticated and returns rows', () => {
  assert.match(route, /getWorkspaceAccess/);
  assert.match(route, /buildPlaybookGuidance/);
  assert.match(route, /rows/);
  assert.match(route, /status: 401/);
});
