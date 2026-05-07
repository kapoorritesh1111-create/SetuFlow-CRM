import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const drawer = readFileSync('src/features/products/components/product-detail-drawer.tsx', 'utf8');
const actionMap = readFileSync('src/features/products/components/products-workspace-action-map.tsx', 'utf8');
const productsTable = readFileSync('src/features/products/components/products-table.tsx', 'utf8');
const productsHelp = readFileSync('docs/help/products.md', 'utf8');

test('product detail drawer keeps all protected tabs', () => {
  for (const label of ['Overview', 'Pricing', 'Variants', 'Trade', 'History']) {
    assert.match(drawer, new RegExp(`label: "${label}"`));
  }
});

test('product screens avoid help and development-style text', () => {
  for (const source of [drawer, actionMap]) {
    assert.doesNotMatch(source, /Product drawer guidance/);
    assert.doesNotMatch(source, /Choose the right product action before editing/);
    assert.doesNotMatch(source, /Products is for daily catalog work/);
    assert.doesNotMatch(source, /Quote-only overrides still belong in Quotes/);
    assert.doesNotMatch(source, /customer-specific price changes stay in the quote workspace/);
    assert.doesNotMatch(source, /Use this only for product defaults that future quotes can inherit/);
    assert.doesNotMatch(source, /dev|debug|TODO|FIXME/i);
  }
});

test('product table row actions use concise operational labels', () => {
  assert.match(productsTable, /Readiness/);
  assert.match(productsTable, /Actions/);
  assert.match(productsTable, /Quick quote/);
  assert.match(productsTable, /Open pricing/);
  assert.match(productsTable, /Open product/);
  assert.doesNotMatch(productsTable, /help|development|debug/i);
});

test('product detail drawer polish does not add new write handlers', () => {
  assert.match(drawer, /updateProductDetail/);
  assert.match(drawer, /deleteProduct/);
  assert.doesNotMatch(drawer, /apply-hsn|saveCatalogPrice|distributeProductPricing|quote-specific write-back/);
});

test('products help keeps the policy outside product screens', () => {
  assert.match(productsHelp, /Product drawer guidance/);
  assert.match(productsHelp, /product defaults in Products/);
  assert.match(productsHelp, /governed defaults in Product Management/);
  assert.match(productsHelp, /customer-specific terms in Quotes/);
});
