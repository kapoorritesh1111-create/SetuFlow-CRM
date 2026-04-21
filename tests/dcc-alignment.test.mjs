import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc aligns to PR-36 truth and closed stack', () => {
  assert.match(dcc, /PR-36 complete/i);
  assert.match(dcc, /0 remaining/i);
  assert.match(dcc, /Investor readiness<\/div><div class="bar"><span style="width:94%"/i);
});
