import { readFileSync } from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const helper = readFileSync('src/lib/trial/capability.ts', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

test('S24-TRIAL-191 exposes app-level trial capability helpers', () => {
  assert.match(helper, /export type TrialCapability = \{/);
  assert.match(helper, /export async function getTrialCapability/);
  assert.match(helper, /export async function isTrialOrg/);
  assert.match(helper, /export function hasReachedTrialLimit/);
  assert.match(helper, /export function getRemainingTrialSlots/);
});

test('S24-TRIAL-191 keeps all approved trial template keys available', () => {
  for (const templateKey of [
    'export_foods_basic',
    'ingredient_trader',
    'distributor_importer',
    'packaging_converter',
  ]) {
    assert.match(helper, new RegExp(`'${templateKey}'`));
  }

  assert.match(helper, /export function normalizeTrialTemplateKey/);
});

test('S24-TRIAL-191 calls the approved trial RPCs without adding routes or enforcement', () => {
  assert.match(helper, /rpc\('get_trial_capability'/);
  assert.match(helper, /rpc\('is_trial_org'/);
  assert.doesNotMatch(helper, /create_guided_trial_entitlement/);
  assert.doesNotMatch(helper, /redirect\(/);
});

test('S24-TRIAL-191 helper regression is wired into npm test', () => {
  assert.match(packageJson.scripts.test, /tests\/s24-trial-191-capability-model\.test\.mjs/);
});
