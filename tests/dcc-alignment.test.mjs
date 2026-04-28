import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('internal dcc exposes the active readiness, reference coverage, and PR requirements truth', () => {
  assert.match(dcc, /Module readiness \+ workflow readiness/i);
  assert.match(dcc, /Reference HTML coverage/i);
  assert.match(dcc, /PR Change Requirements/i);
  assert.match(dcc, /No Supabase changes required/i);
  assert.match(dcc, /Runtime stabilization/i);
  assert.match(dcc, /PR-NS-04/i);
});
