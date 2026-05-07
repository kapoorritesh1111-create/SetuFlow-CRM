import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const enhancer = readFileSync('src/features/leads/components/quote-compliance-fix-enhancer.tsx', 'utf8');
const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');
const compliancePage = readFileSync('src/app/(app)/compliance/assist/page.tsx', 'utf8');

test('quote preview compliance blocker receives a direct quote-scoped fix action', () => {
  assert.match(enhancer, /resolve compliance\/document blocker/);
  assert.match(enhancer, /Fix compliance/);
  assert.match(enhancer, /\/compliance\/assist\?quoteId=/);
  assert.match(enhancer, /attach evidence, waive for quote, or defer the document to dispatch/);
});

test('quote preview fix action avoids guessing unrelated lead links', () => {
  assert.match(enhancer, /findQuoteId/);
  assert.match(enhancer, /findLeadIdFromCurrentUrl/);
  assert.doesNotMatch(enhancer, /function findLeadIdFromHref/);
  assert.doesNotMatch(enhancer, /findLeadIdFromHref\(pageAnchor/);
});

test('Compliance Assist resolves the active lead from quote id and shows workflow context', () => {
  assert.match(compliancePage, /quoteId/);
  assert.match(compliancePage, /from\('quotes'\)/);
  assert.match(compliancePage, /lead_id/);
  assert.match(compliancePage, /Lead → Quote → Compliance/);
  assert.match(compliancePage, /Active workflow context/);
});

test('authenticated layout mounts the quote compliance fix enhancer', () => {
  assert.match(layout, /QuoteComplianceFixEnhancer/);
  assert.match(layout, /quote-compliance-fix-enhancer/);
});
