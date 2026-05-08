import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const enhancer = readFileSync('src/features/leads/components/quote-compliance-fix-enhancer.tsx', 'utf8');
const route = readFileSync('src/app/api/compliance/quote-fix/route.ts', 'utf8');

test('quote compliance blocker fixes inline without routing to compliance page', () => {
  assert.match(enhancer, /Resolve here/);
  assert.match(enhancer, /Quote review fix/);
  assert.match(enhancer, /\/api\/compliance\/quote-fix/);
  assert.doesNotMatch(enhancer, /\/compliance\/assist\?quoteId=/);
});

test('inline enhancer targets one blocker panel and avoids global mutation observer loops', () => {
  assert.match(enhancer, /getTargetBlockerPanel/);
  assert.match(enhancer, /enhanceBlockerOnce/);
  assert.doesNotMatch(enhancer, /new MutationObserver/);
  assert.doesNotMatch(enhancer, /appendChild\(makeExplainer/);
});

test('waive and defer clear the active lead compliance blocker as well as saving quote document', () => {
  assert.match(route, /lead_compliance_items/);
  assert.match(route, /status: 'waived'/);
  assert.match(route, /clearedComplianceItems/);
  assert.match(route, /quote_compliance_deferred_to_dispatch/);
});
