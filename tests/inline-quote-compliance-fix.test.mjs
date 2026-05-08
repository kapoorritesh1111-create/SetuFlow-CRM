import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const enhancer = readFileSync('src/features/leads/components/quote-compliance-fix-enhancer.tsx', 'utf8');
const route = readFileSync('src/app/api/compliance/quote-fix/route.ts', 'utf8');

test('quote compliance blocker fixes inline instead of routing to compliance page', () => {
  assert.match(enhancer, /Fix here/);
  assert.match(enhancer, /Fix inside quote review/);
  assert.match(enhancer, /\/api\/compliance\/quote-fix/);
  assert.doesNotMatch(enhancer, /\/compliance\/assist\?quoteId=/);
});

test('inline quote compliance fix can attach waive and defer against quote documents', () => {
  assert.match(route, /related_entity: 'quote'/);
  assert.match(route, /quote_review_evidence/);
  assert.match(route, /quote_waiver/);
  assert.match(route, /dispatch_defer/);
  assert.match(route, /inline_quote_review_fix/);
});
