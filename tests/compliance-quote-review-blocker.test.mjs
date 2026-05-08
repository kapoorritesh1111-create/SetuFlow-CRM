import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const page = readFileSync('src/app/(app)/compliance/assist/page.tsx', 'utf8');
const actions = readFileSync('src/features/compliance/server/actions.ts', 'utf8');

test('Compliance Assist reads quote-linked documents for quote review blocker', () => {
  assert.match(page, /related_entity', 'quote'/);
  assert.match(page, /Latest document: none linked/);
  assert.match(page, /Exact quote-review blocker/);
  assert.match(page, /Quick compliance fix/);
});

test('Compliance Assist returns to quote review step', () => {
  assert.match(page, /Back to review/);
  assert.match(page, /quoteStep=review/);
  assert.match(page, /#quote-review/);
});

test('Compliance actions support explicit quote-linked evidence and reviewed decisions', () => {
  assert.match(actions, /quote_id/);
  assert.match(actions, /related_entity: relatedEntity/);
  assert.match(actions, /linked_quote_id: quote\?\.id/);
  assert.match(actions, /quote-review-upload/);
  assert.match(actions, /dispatch-deferral/);
});
