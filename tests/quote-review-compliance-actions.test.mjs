import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const component = readFileSync('src/features/leads/components/quote-review-compliance-actions.tsx', 'utf8');
const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');

test('quote review compliance actions render only on quote review route', () => {
  assert.match(component, /quoteStep/);
  assert.match(component, /isQuoteReviewRoute/);
  assert.match(component, /pathname\.startsWith\('\/leads'\)/);
  assert.match(component, /quoteStep.*review/s);
});

test('quote review compliance actions save through quote gate API and refresh in place', () => {
  assert.match(component, /\/api\/compliance\/quote-fix/);
  assert.match(component, /router\.refresh\(\)/);
  assert.match(component, /Defer to dispatch/);
  assert.match(component, /Waive for quote/);
  assert.doesNotMatch(component, /MutationObserver/);
  assert.doesNotMatch(component, /document\.querySelector/);
});

test('layout mounts stable React quote review actions but not the removed DOM enhancer', () => {
  assert.match(layout, /QuoteReviewComplianceActions/);
  assert.doesNotMatch(layout, /QuoteComplianceFixEnhancer/);
  assert.doesNotMatch(layout, /quote-compliance-fix-enhancer/);
});
