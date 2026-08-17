import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

// This suite is intentionally part of test:packaging so the preview cannot ship the old all-in-one Admin UX by accident.
test('S51-PKG-048: Packaging Admin uses the approved Products Components Builder language', () => {
  const shell = read('src/features/admin/components/admin-settings-shell.tsx');
  assert.match(shell, /label: 'Packaging Products'/);
  assert.match(shell, /label: 'Pricing Components'/);
  assert.match(shell, /label: 'Pricing Builder'/);
  assert.match(shell, /Products, sizes & KLDs/);
  assert.match(shell, /Recipes, rules & live preview/);
});

test('S51-PKG-048: Packaging Products owns sizes and KLD UX', () => {
  const page = read('src/app/(app)/admin/packaging-families/page.tsx');
  const manager = read('src/features/packaging/components/packaging-products-v4-manager.tsx');
  assert.match(page, /PackagingProductsV4Manager/);
  assert.match(manager, /Sizes & KLDs/);
  assert.match(manager, /Bulk KLD upload/);
  assert.match(manager, /Unmatched PDFs are not uploaded or guessed/);
});

test('S51-PKG-048: Pricing Components reuses the Reference Library route without duplicate master editors in Pricing Builder', () => {
  const componentsPage = read('src/app/(app)/admin/packaging-reference-library/page.tsx');
  const components = read('src/features/packaging/components/pricing-components-v4-manager.tsx');
  const builderPage = read('src/app/(app)/admin/packaging-templates/page.tsx');
  assert.match(componentsPage, /PricingComponentsV4Manager/);
  assert.match(components, /Materials/);
  assert.match(components, /Production/);
  assert.match(components, /Finishes & Extras/);
  assert.doesNotMatch(builderPage, /PricingV4AdminCatalogEditor/);
  assert.doesNotMatch(builderPage, /PricingV4AdminWorkspace/);
});

test('S51-PKG-048: Pricing Builder is a recipe editor with sticky live calculation preview and source matrix drill-down', () => {
  const builder = read('src/features/packaging/components/pricing-builder-v4-workspace.tsx');
  const preview = read('src/features/packaging/components/pricing-v4-live-preview.tsx');
  assert.match(builder, /Construction · Material Recipe/);
  assert.match(builder, /Printing & Lamination/);
  assert.match(builder, /Production Processes/);
  assert.match(builder, /Wastage & Margin Rules/);
  assert.match(builder, /Extras \/ Charges/);
  assert.match(builder, /View \/ Edit Source Matrix/);
  assert.match(preview, /Live Price Preview/);
  assert.match(preview, /xl:sticky/);
  assert.match(preview, /Cost build/);
  assert.match(preview, /Total before freight/);
});

test('S51-PKG-050: KLD repository reads the actual live table columns and normalizes snapshot metadata', () => {
  const repository = read('src/lib/packaging-pricing/repository.ts');
  const sales = read('src/lib/packaging-pricing/sales-options.ts');
  assert.match(repository, /file_path,file_name,version,mime_type,file_size/);
  assert.match(repository, /storage_bucket: 'compliance-docs'/);
  assert.match(repository, /version_label: `v\$\{Number\(data\.version/);
  assert.doesNotMatch(repository, /\.select\([^\n]*file_url/);
  assert.doesNotMatch(sales, /\.select\([^\n]*version_label/);
});
