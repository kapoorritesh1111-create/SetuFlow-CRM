import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');

test('dcc exposes current, ux 99 tracker, ux audit, and archive tabs while preserving release truth', () => {
  assert.match(dcc, /Release truth \+ UX 99 system tracker/i);
  assert.match(dcc, /UX 99 tracker/i);
  assert.match(dcc, /UX audit/i);
  assert.match(dcc, /Archive/i);
  assert.match(dcc, /UX 99 program active/i);
  assert.match(dcc, /Reset history archived/i);
  assert.match(dcc, /All tracked modules are at or above 96%/i);
  assert.match(dcc, /PR-UX-01/i);
  assert.match(dcc, /PR-UX-05/i);
});
