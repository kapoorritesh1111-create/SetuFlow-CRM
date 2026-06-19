/**
 * Unit tests — SMC feature-flag evaluation (S32-SMC-001)
 * src/lib/flags/feature-flags.ts — pure logic, no Supabase.
 * Run: tsx --test tests/smc-feature-flags.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateFlag } from '../src/lib/flags/feature-flags';

const ORG = '3327b9a7-aadb-44b0-9793-30c4045d3c92';
const base = { flag_key: 'demo', enabled: true, rollout_percentage: 100 };

test('unknown flag key fails open', () => {
  assert.equal(evaluateFlag(null, ORG), true);
});
test('disabled flag is off', () => {
  assert.equal(evaluateFlag({ ...base, enabled: false }, ORG), false);
});
test('blocked org is off even when allow-listed', () => {
  assert.equal(evaluateFlag({ ...base, allowed_orgs: [ORG], blocked_orgs: [ORG] }, ORG), false);
});
test('allow-list excludes non-members and includes members', () => {
  assert.equal(evaluateFlag({ ...base, allowed_orgs: ['other'] }, ORG), false);
  assert.equal(evaluateFlag({ ...base, allowed_orgs: [ORG] }, ORG), true);
});
test('rollout 0 hides for all, 100 shows for all', () => {
  assert.equal(evaluateFlag({ ...base, rollout_percentage: 0 }, ORG), false);
  assert.equal(evaluateFlag({ ...base, rollout_percentage: 100 }, ORG), true);
});
test('rollout is deterministic for the same org', () => {
  assert.equal(
    evaluateFlag({ ...base, rollout_percentage: 50 }, ORG),
    evaluateFlag({ ...base, rollout_percentage: 50 }, ORG),
  );
});
