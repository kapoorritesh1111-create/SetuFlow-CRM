import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const drawer = readFileSync('src/features/products/components/product-detail-drawer.tsx', 'utf8');
const productsHelp = readFileSync('docs/help/products.md', 'utf8');

test('product detail drawer keeps all protected tabs', () => {
  for (const label of ['Overview', 'Pricing', 'Variants', 'Trade', 'History']) {
    assert.match(drawer, new RegExp(`label: "${label}"`));
  }
});

test('product detail drawer explains product-default versus quote-only boundaries', () => {
  assert.match(drawer, /Quote-only overrides still belong in Quotes/);
  assert.match(drawer, /customer-specific price changes stay in the quote workspace/);
  assert.match(drawer, /Use this only for product defaults that future quotes can inherit/);
  assert.match(drawer, /drawerGuidanceCard/);
});

test('product detail drawer guidance does not add new write handlers', () => {
  assert.match(drawer, /updateProductDetail/);
  assert.match(drawer, /deleteProduct/);
  assert.doesNotMatch(drawer, /apply-hsn|saveCatalogPrice|distributeProductPricing|quote-specific write-back/);
});

test('products help teaches Setu Guru the drawer boundaries', () => {
  assert.match(productsHelp, /Product drawer guidance/);
  assert.match(productsHelp, /product defaults in Products/);
  assert.match(productsHelp, /governed defaults in Product Management/);
  assert.match(productsHelp, /customer-specific terms in Quotes/);
});
