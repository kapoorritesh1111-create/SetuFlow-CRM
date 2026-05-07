import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const productsPage = readFileSync('src/app/(app)/products/page.tsx', 'utf8');
const actionMap = readFileSync('src/features/products/components/products-workspace-action-map.tsx', 'utf8');
const productsHelp = readFileSync('docs/help/products.md', 'utf8');

test('Products workspace renders an action map before the spreadsheet page', () => {
  assert.match(productsPage, /ProductsWorkspaceActionMap/);
  assert.match(productsPage, /ProductsSpreadsheetPage/);
  assert.ok(productsPage.indexOf('ProductsWorkspaceActionMap') < productsPage.indexOf('ProductsSpreadsheetPage'));
});

test('Products action map routes to safe views without changing save handlers', () => {
  assert.match(actionMap, /Fix catalog gaps/);
  assert.match(actionMap, /Review quote-ready products/);
  assert.match(actionMap, /Edit product defaults/);
  assert.match(actionMap, /Work pricing coverage/);
  assert.match(actionMap, /\/products\?gap=has_gap/);
  assert.match(actionMap, /\/products\?quoteable=quoteable/);
  assert.match(actionMap, /\/products\?mode=products/);
  assert.match(actionMap, /\/products\?mode=pricing&gap=has_gap/);
  assert.doesNotMatch(actionMap, /saveProduct|saveCatalogPrice|deleteProduct|distributeProductPricing/);
});

test('Products help preserves the product default and quote-only boundary', () => {
  assert.match(productsHelp, /Products workspace action map/);
  assert.match(productsHelp, /Quote-only price changes/);
  assert.match(productsHelp, /customer-specific commercial terms stay inside the quote workspace/);
  assert.match(productsHelp, /saved defaults require explicit authorized approval/);
});
