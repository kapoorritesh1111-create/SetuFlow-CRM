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

test('S51-PKG-048: Pricing Builder uses a compact single-active-step recipe workflow', () => {
  const page = read('src/app/(app)/admin/packaging-templates/page.tsx');
  const builder = read('src/features/packaging/components/pricing-builder-v4-compact-workspace.tsx');
  assert.match(page, /PricingBuilderV4CompactWorkspace/);
  assert.match(builder, /type FormulaStep='recipe'\|'construction'\|'processes'\|'commercial'\|'extras'\|'review'/);
  assert.match(builder, /StepNav/);
  assert.match(builder, /activeStep==='construction'/);
  assert.match(builder, /activeStep==='processes'/);
  assert.match(builder, /Choose one construction at a time/);
  assert.match(builder, /View \/ Edit Source Matrix/);
  assert.doesNotMatch(page, /PricingTemplateBuilderGuided/);
  assert.doesNotMatch(page, /Legacy v3 pricing builder/);
});

test('S51-PKG-048: Price Per Pouch is the primary always-visible selling KPI', () => {
  const preview = read('src/features/packaging/components/pricing-v4-live-preview.tsx');
  assert.match(preview, /Live Price Preview/);
  assert.match(preview, /xl:sticky/);
  assert.match(preview, /Price Per Pouch/);
  assert.match(preview, /text-4xl/);
  assert.match(preview, /selling_price\?\.unit_price/);
  assert.match(preview, /Product total/);
  assert.match(preview, /GST/);
  assert.match(preview, /Total before freight/);
  assert.match(preview, /Production & cost breakdown/);
});

test('S51-PKG-051: SETU Support Mode can be hidden without losing the org switch control', () => {
  const layout = read('src/app/(app)/layout.tsx');
  const badge = read('src/components/shell/support-mode-badge.tsx');
  assert.match(layout, /SupportModeBadge/);
  assert.match(badge, /setu-support-mode-badge-hidden/);
  assert.match(badge, /Hide SETU Support Mode controls/);
  assert.match(badge, /Show SETU Support Mode controls/);
  assert.match(badge, /Switch org/);
  assert.match(badge, /localStorage/);
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

test('S51-PKG-048: Pricing Components supports safe inline rate-only updates', () => {
  const components = read('src/features/packaging/components/pricing-components-v4-manager.tsx');
  const actions = read('src/features/packaging/server/pricing-v4-admin-catalog-actions.ts');
  assert.match(components, /savePackagingCostMasterRateV4/);
  assert.match(components, /savePackagingChargeMasterRateV4/);
  assert.match(components, /Save rate/);
  assert.match(components, /Edit setup/);
  assert.match(components, /name="current_rate"/);
  assert.match(components, /bg-yellow-50/);
  assert.match(actions, /export async function savePackagingCostMasterRateV4/);
  assert.match(actions, /export async function savePackagingChargeMasterRateV4/);
  const helper = actions.match(/async function savePricingMasterRateOnly[\s\S]*?export async function savePackagingCostMasterRateV4/)?.[0] ?? '';
  assert.match(helper, /adminDb\(\)/);
  assert.match(helper, /\.eq\('organization_id', organization\.id\)/);
  assert.match(helper, /current_rate: currentRate/);
  assert.match(helper, /updated_by:user\.id/);
  assert.doesNotMatch(helper, /syncCostFamilies|syncChargeFamilies|family_ids/);
});
