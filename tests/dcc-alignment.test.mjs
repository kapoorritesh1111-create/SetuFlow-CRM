import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc exposes current clean baseline, onboarding truth, and preserved test results format', () => {
  assert.match(dcc, /Current Baseline/i);
  assert.match(dcc, /Client onboarding/i);
  assert.match(dcc, /\/onboarding/);
  assert.match(dcc, /\/admin\/client-onboarding/);
  assert.match(dcc, /companyname\.setuflowcrm\.com/);
  assert.match(dcc, /Test Results/i);
  assert.match(dcc, /68\/68 PASS/i);
  assert.match(dcc, /badge-pass/i);
  assert.match(dcc, /Share vCard/);
  assert.match(dcc, /Signed-in|signed-in|Signed in/);
  assert.doesNotMatch(dcc, /docs\/Archive|public\/internal-dcc\/archive|indexold/i);
});
