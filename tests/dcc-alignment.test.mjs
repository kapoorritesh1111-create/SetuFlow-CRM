import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc aligns to PR-RESET-07 truth and current release framing', () => {
  assert.match(dcc, /PR-RESET-07 completed/i);
  assert.match(dcc, /Current pass: PR-RESET-07/i);
  assert.match(dcc, /True remaining PR count: 2/i);
  assert.match(dcc, /Capture<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Settings \/ Lists<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Admin \/ Organization<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Release recommendation:<\/strong> ready for final trust trim, not yet final sign-off/i);
});
