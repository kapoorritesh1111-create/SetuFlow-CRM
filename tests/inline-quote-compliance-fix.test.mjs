import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const route = readFileSync('src/app/api/compliance/quote-fix/route.ts', 'utf8');
const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');

test('quote compliance fix is no longer mounted as a layout DOM enhancer', () => {
  assert.doesNotMatch(layout, /QuoteComplianceFixEnhancer/);
  assert.doesNotMatch(layout, /quote-compliance-fix-enhancer/);
});

test('waive and defer save quote document evidence and approve the active quote gate blocker', () => {
  assert.match(route, /related_entity: 'quote'/);
  assert.match(route, /quote_waiver/);
  assert.match(route, /dispatch_defer/);
  assert.match(route, /lead_compliance_items/);
  assert.match(route, /status: 'approved'/);
  assert.match(route, /submitted_at: now, approved_at: now/);
  assert.doesNotMatch(route, /status: 'waived'/);
  assert.doesNotMatch(route, /'waived'\.includes/);
});

test('audit trail keeps the human waiver or dispatch decision even though gate status is approved', () => {
  assert.match(route, /quote_compliance_waived/);
  assert.match(route, /quote_compliance_deferred_to_dispatch/);
  assert.match(route, /lead_compliance_status: action === 'attach' \? null : 'approved'/);
  assert.match(route, /approved_for_quote_send_with_recorded_reason/);
});
