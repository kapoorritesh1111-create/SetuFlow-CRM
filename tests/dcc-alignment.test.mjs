import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc aligns to PR-FINISH-06 truth and final release framing', () => {
  assert.match(dcc, /PR-FINISH-06 completed/i);
  assert.match(dcc, /Current pass: PR-FINISH-06/i);
  assert.match(dcc, /True remaining PR count: 0/i);
  assert.match(dcc, /Capture<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Settings \/ Lists<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Admin \/ Organization<\/td><td class="score good">96%<\/td>/i);
  assert.match(dcc, /Release recommendation:<\/strong> ready for final sign-off/i);
});
