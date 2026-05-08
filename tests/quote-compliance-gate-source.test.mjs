import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/compliance/quote-fix/route.ts', 'utf8');
const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');

test('quote review compliance panel is not mounted globally from app layout', () => {
  assert.doesNotMatch(layout, /QuoteReviewComplianceActions/);
  assert.doesNotMatch(layout, /quote-review-compliance-actions/);
  assert.doesNotMatch(layout, /QuoteComplianceFixEnhancer/);
});

test('quote requirement lookup uses typed market and product id sets', () => {
  assert.match(route, /const marketIds: Set<string>/);
  assert.match(route, /const productIds: Set<string>/);
  assert.match(route, /ruleApplies\(rule, lead, marketIds, productIds\)/);
});

test('waive and defer satisfy lead-level document requirements used by the quote gate', () => {
  assert.match(route, /getMissingQuoteRequirementCodes/);
  assert.match(route, /document_requirement_rules/);
  assert.match(route, /related_entity: 'lead'/);
  assert.match(route, /requirement_code: code/);
  assert.match(route, /status: 'approved'/);
  assert.match(route, /approvedLeadRequirements/);
});

test('waive and defer still clear lead compliance items and preserve quote audit', () => {
  assert.match(route, /lead_compliance_items/);
  assert.match(route, /status: 'approved'/);
  assert.match(route, /quote_compliance_waived/);
  assert.match(route, /quote_compliance_deferred_to_dispatch/);
  assert.match(route, /lead_requirements_and_compliance_approved_with_recorded_reason/);
});
