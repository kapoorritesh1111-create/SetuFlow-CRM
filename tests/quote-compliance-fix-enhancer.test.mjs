import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const enhancer = readFileSync('src/features/leads/components/quote-compliance-fix-enhancer.tsx', 'utf8');
const layout = readFileSync('src/app/(app)/layout.tsx', 'utf8');

test('quote preview compliance blocker receives a direct fix action', () => {
  assert.match(enhancer, /resolve compliance\/document blocker/);
  assert.match(enhancer, /Fix compliance/);
  assert.match(enhancer, /\/compliance\/assist\?leadId=/);
  assert.match(enhancer, /attach evidence, waive for quote, or defer the document to dispatch/);
});

test('authenticated layout mounts the quote compliance fix enhancer', () => {
  assert.match(layout, /QuoteComplianceFixEnhancer/);
  assert.match(layout, /quote-compliance-fix-enhancer/);
});
