import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const productsPage = readFileSync('src/app/(app)/products/page.tsx', 'utf8');
const productsHelp = readFileSync('docs/help/products.md', 'utf8');

test('Products page keeps a single primary catalog control surface', () => {
  assert.match(productsPage, /ProductsSpreadsheetPage/);
  assert.doesNotMatch(productsPage, /ProductsWorkspaceActionMap/);
  assert.doesNotMatch(productsPage, /products-workspace-action-map/);
});

test('Products page still passes existing filter query params to the spreadsheet controls', () => {
  for (const key of ['search', 'category', 'pricingMode', 'gap', 'active', 'quoteable', 'mode']) {
    assert.match(productsPage, new RegExp(key));
  }
});

test('Products help preserves the product default and quote-only boundary without recommending duplicate work surfaces', () => {
  assert.match(productsHelp, /duplicate work surfaces/);
  assert.match(productsHelp, /Quote-only price changes/);
  assert.match(productsHelp, /customer-specific commercial terms stay inside the quote workspace/);
  assert.match(productsHelp, /saved defaults require explicit authorized approval/);
});
