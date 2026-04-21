import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');
test('dcc aligns to PR-29 release-gate truth', () => { assert.match(dcc, /PR-29/); });
