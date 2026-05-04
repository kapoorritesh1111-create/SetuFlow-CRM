import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const page = readFileSync('src/app/(app)/admin/client-onboarding/page.tsx', 'utf8');

test('client onboarding website links are normalized as external URLs', () => {
  assert.match(page, /function externalUrl/);
  assert.match(page, /https:\/\/\$\{trimmed\}/);
  assert.match(page, /target="_blank"/);
  assert.doesNotMatch(page, /href=\{request\.website\}/);
});
