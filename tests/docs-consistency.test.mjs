import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const releaseReadiness = readFileSync('docs/RELEASE_READINESS.md', 'utf8');
const statusContract = readFileSync('src/lib/product-status-contract.ts', 'utf8');

test('docs and status contract avoid sprint leakage in shipped baseline', () => {
  assert.doesNotMatch(statusContract, /Sprint\s*[0-9]+/i);
  assert.doesNotMatch(statusContract, /April 21/i);
  assert.match(releaseReadiness, /Readiness/i);
});
