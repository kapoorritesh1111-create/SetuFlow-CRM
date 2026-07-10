import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const quoteReadiness = readFileSync('src/lib/setu-guru/quote-readiness.ts', 'utf8');
const quoteReadinessRoute = readFileSync('src/app/api/setu-guru/quote-readiness/route.ts', 'utf8');
const quotePanel = readFileSync('src/features/setu-guru/quote-assistant-panel.tsx', 'utf8');
const supplierRfq = readFileSync('src/lib/setu-guru/supplier-rfq-assistant.ts', 'utf8');
const supplierRfqRoute = readFileSync('src/app/api/setu-guru/supplier-rfq-brief/route.ts', 'utf8');
const supplierRfqPanel = readFileSync('src/features/setu-guru/supplier-rfq-assistant-panel.tsx', 'utf8');
const supplierComparison = readFileSync('src/lib/setu-guru/supplier-comparison.ts', 'utf8');
const supplierComparisonRoute = readFileSync('src/app/api/setu-guru/supplier-comparison/route.ts', 'utf8');
const supplierComparisonPage = readFileSync('src/app/(app)/growth-agent/suppliers/page.tsx', 'utf8');
const leadDetailPage = readFileSync('src/app/(app)/leads/[leadId]/page.tsx', 'utf8');

test('Quote readiness is read-only and never creates, updates, or prices a quote', () => {
  assert.match(quoteReadiness, /\.eq\('organization_id', orgId\)/);
  assert.doesNotMatch(quoteReadiness, /from\(['"]quotes['"]\)\.(insert|update)/);
});

test('Quote Assistant links to the existing quote builder route rather than reimplementing pricing', () => {
  assert.match(quotePanel, /href=\{`\/leads\/\$\{readiness\.leadId\}\/quote`\}/);
  assert.match(quotePanel, /Setu Guru does not set prices or create quotes here/);
  assert.match(quoteReadinessRoute, /requireWorkspace\(\)/);
});

test('Supplier RFQ Assistant produces a brief only and never creates or submits an RFQ record', () => {
  assert.match(supplierRfq, /\.eq\('organization_id', orgId\)/);
  assert.doesNotMatch(supplierRfq, /from\(['"]rfqs['"]\)\.(insert|update)/);
  assert.match(supplierRfqRoute, /requireWorkspace\(\)/);
  assert.match(supplierRfqPanel, /Setu Guru does not create or send the RFQ automatically/);
});

test('Supplier comparison only scores stored, verifiable fields and is organization scoped', () => {
  assert.match(supplierComparison, /\.eq\('organization_id', orgId\)/);
  assert.match(supplierComparison, /documentCompleteness/);
  assert.match(supplierComparison, /responseQuality/);
  assert.doesNotMatch(supplierComparison, /unit_price|fob_price|exw_price|cif_price/);
  assert.match(supplierComparisonRoute, /requireWorkspace\(\)/);
  assert.match(supplierComparisonPage, /requireWorkspace\(\)/);
});

test('Quote and RFQ approval guardrails hold: no Sprint 45 feature writes to quotes or rfqs tables', () => {
  const combined = [quoteReadiness, supplierRfq, supplierComparison].join('\n');
  assert.doesNotMatch(combined, /from\(['"]quotes['"]\)\.(insert|update|delete)/);
  assert.doesNotMatch(combined, /from\(['"]rfqs['"]\)\.(insert|update|delete)/);
  assert.doesNotMatch(combined, /status:\s*'approved'/);
});

test('Quote Assistant and Supplier RFQ Assistant are wired into the lead detail page based on lead_type', () => {
  assert.match(leadDetailPage, /QuoteAssistantLauncher/);
  assert.match(leadDetailPage, /SupplierRfqAssistantLauncher/);
  assert.match(leadDetailPage, /data\.lead\.lead_type \?\? ''\)\.toLowerCase\(\) === 'supplier'/);
});
