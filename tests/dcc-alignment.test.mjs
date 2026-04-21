import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc aligns to PR-UX-01 truth and active stack', () => {
  assert.match(dcc, /PR-UX-01 complete/i);
  assert.match(dcc, /Navigation reset \+ information architecture cleanup/i);
  assert.match(dcc, /0 modules at the 96% bar/i);
  assert.match(dcc, /Buyer readiness<\/span><strong>79%<\/strong>/i);
});
