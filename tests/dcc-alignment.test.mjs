import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc aligns to PR-UX-08 truth and final release framing', () => {
  assert.match(dcc, /PR-UX-08 completed/i);
  assert.match(dcc, /96% finish pass \+ empty\/loading\/success lock/i);
  assert.match(dcc, /Buyer readiness<\/span><strong>94%<\/strong>/i);
  assert.match(dcc, /release candidate for internal review \/ guided demos/i);
});
