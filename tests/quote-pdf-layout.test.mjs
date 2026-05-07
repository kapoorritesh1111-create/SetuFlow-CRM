import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const pdfRoute = readFileSync('src/app/api/quotes/[quoteId]/pdf/route.ts', 'utf8');
const quotesHelp = readFileSync('docs/help/quotes.md', 'utf8');

test('quote pdf table uses buyer-facing price list columns', () => {
  for (const label of ['SKU', 'Product', 'Pack (g)', 'Units/Case', 'MOQ cases', 'Basis', '/Unit', '/Case', 'Total (']) {
    assert.match(pdfRoute, new RegExp(label.replace(/[()]/g, '\\$&')));
  }
});

test('quote pdf table columns fit inside the printable width', () => {
  assert.match(pdfRoute, /const tableX = 18; const tableW = 576/);
  assert.match(pdfRoute, /\['Total \(\$\{data\.currency\}\)', 80, 'right'\]/);
  assert.doesNotMatch(pdfRoute, /\['MOQ \(cases\)', 58, 'right'\]/);
});

test('quote pdf includes seller address and tax lines', () => {
  assert.match(pdfRoute, /registered_address, city, postal_code, headquarters_country/);
  assert.match(pdfRoute, /function addressLines/);
  assert.match(pdfRoute, /Tax ID:/);
});

test('quote pdf uses pack and case defaults when catalog fields are sparse', () => {
  assert.match(pdfRoute, /function inferredSnackPackGrams/);
  assert.match(pdfRoute, /function inferredUnitsPerCase/);
  assert.match(pdfRoute, /function inferredMoqCases/);
  assert.match(pdfRoute, /packGrams\(variant, product\)/);
});

test('quote pdf uses selected quote currency labels and not hardcoded USD columns', () => {
  assert.match(pdfRoute, /const currency = String\(quote\.display_currency \?\? quote\.currency/);
  assert.match(pdfRoute, /`\$\{data\.currency\}\/Unit`/);
  assert.match(pdfRoute, /`\$\{data\.currency\}\/Case`/);
  assert.doesNotMatch(pdfRoute, /USD\/Unit/);
  assert.doesNotMatch(pdfRoute, /USD\/Case/);
});

test('quote pdf treats quote line price as case price and derives unit price', () => {
  assert.match(pdfRoute, /const casePrice = n\(line\.unit_price \?\? line\.catalog_price_amount\)/);
  assert.match(pdfRoute, /const unitPrice = unitsPerCase > 1 \? casePrice \/ unitsPerCase : casePrice/);
  assert.match(pdfRoute, /total: moqCases \* casePrice/);
});

test('quote pdf keeps quote-only behavior out of product defaults and schema changes', () => {
  assert.doesNotMatch(pdfRoute, /updateProductDetail|savePricingCalculatorSnapshot|apply-hsn|alter table|create table/i);
  assert.match(pdfRoute, /quote_line_items/);
});

test('quotes help teaches the professional pdf table and selected currency rule', () => {
  assert.match(quotesHelp, /professional quote PDF/);
  assert.match(quotesHelp, /Line total in selected quote currency, calculated as MOQ cases × case price/);
  assert.match(quotesHelp, /Do not hardcode USD/);
});
