import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema=fs.readFileSync('supabase/migrations/20260914013000_s52_pkg_v5_schema.sql','utf8');
const rateOverrides=fs.readFileSync('supabase/migrations/20260914013050_s52_pkg_v5_rate_overrides.sql','utf8');
const templateScope=fs.readFileSync('supabase/migrations/20260914013500_s52_pkg_v5_template_scoped_structures.sql','utf8');
const quoteIntegrity=fs.readFileSync('supabase/migrations/20260914013600_s52_pkg_v5_quote_template_integrity.sql','utf8');
const benchmarkScope=fs.readFileSync('supabase/migrations/20260914013610_s52_pkg_v5_benchmark_revision_scope.sql','utf8');
const persistence=fs.readFileSync('supabase/migrations/20260914013300_s52_pkg_v5_quote_persistence.sql','utf8');
const quotePage=fs.readFileSync('src/app/(app)/leads/[leadId]/quote/page.tsx','utf8');
const matrixPage=fs.readFileSync('src/app/(app)/admin/packaging-pricing-v5/matrix/page.tsx','utf8');
const salesOptions=fs.readFileSync('src/lib/packaging-pricing-v5/sales-options.ts','utf8');
const salesConfigurator=fs.readFileSync('src/features/packaging/components/pricing-v5-sales-configurator.tsx','utf8');
const compatibility=fs.readFileSync('src/lib/packaging-pricing-v5/construction-compatibility.ts','utf8');
const snapshot=fs.readFileSync('src/lib/packaging-pricing-v5/snapshot.ts','utf8');
const engine=fs.readFileSync('src/lib/packaging-pricing-v5/sup-formula-engine.ts','utf8');
const adminActions=fs.readFileSync('src/features/packaging/server/pricing-v5-admin-actions.ts','utf8');
const matrixActions=fs.readFileSync('src/features/packaging/server/pricing-v5-matrix-actions.ts','utf8');
const adminWorkspace=fs.readFileSync('src/features/packaging/components/pricing-v5-admin-workspace.tsx','utf8');
const matrixWorkspace=fs.readFileSync('src/features/packaging/components/pricing-v5-price-matrix.tsx','utf8');
const repository=fs.readFileSync('src/lib/packaging-pricing-v5/repository.ts','utf8');
const starkSeed=fs.readFileSync('supabase/migrations/20260914013100_s52_pkg_v5_stark_master_seed.sql','utf8');

test('S52-PKG-V5: v5 uses isolated tables and a separate disabled feature flag',()=>{
  assert.match(schema,/create table if not exists public\.packaging_size_profiles_v5/i);
  assert.match(schema,/create table if not exists public\.packaging_constructions_v5/i);
  assert.match(schema,/create table if not exists public\.packaging_pricing_commercial_bands_v5/i);
  assert.match(schema,/'packaging_pricing_v5'/);
  assert.match(schema,/false\s*,\s*0\s*,\s*array\['b97913cb-3b95-4247-8ced-ffdc0d392d2a'/i);
  assert.doesNotMatch(schema,/update\s+public\.smc_feature_flags[\s\S]*flag_key\s*=\s*'packaging_pricing_v4'/i);
});

test('S52-PKG-V5: v5 rate edits are version-scoped and cannot overwrite v4 masters',()=>{
  assert.match(rateOverrides,/create table if not exists public\.packaging_pricing_cost_rates_v5/i);
  assert.match(rateOverrides,/create table if not exists public\.packaging_pricing_charge_rates_v5/i);
  assert.match(adminActions,/from\('packaging_pricing_cost_rates_v5'\)\.upsert/);
  assert.match(adminActions,/from\('packaging_pricing_charge_rates_v5'\)\.upsert/);
  assert.doesNotMatch(adminActions,/from\('packaging_cost_master_items'\)\s*\.update\(\{current_rate/);
  assert.match(repository,/from\('packaging_pricing_cost_rates_v5'\)/);
  assert.match(repository,/from\('packaging_pricing_charge_rates_v5'\)/);
});

test('S52-PKG-V5: sizes and constructions are template-scoped for immutable revisions',()=>{
  assert.match(templateScope,/packaging_size_profiles_v5 add column if not exists template_id/i);
  assert.match(templateScope,/packaging_constructions_v5 add column if not exists template_id/i);
  assert.match(templateScope,/packaging_construction_layers_v5 add column if not exists template_id/i);
  assert.match(repository,/packaging_size_profiles_v5'[\s\S]*\.eq\('template_id',template\.id\)/);
  assert.match(repository,/packaging_constructions_v5'[\s\S]*\.eq\('template_id',template\.id\)/);
  assert.match(repository,/packaging_construction_layers_v5'[\s\S]*\.eq\('template_id',template\.id\)/);
});

test('S52-PKG-V5: quote lines cannot mix a size from a different template revision',()=>{
  assert.match(quoteIntegrity,/guard_packaging_v5_quote_template_size/);
  assert.match(quoteIntegrity,/s\.template_id=new\.packaging_template_id/);
  assert.match(quoteIntegrity,/s\.family_id=new\.packaging_family_id/);
  assert.match(quoteIntegrity,/before insert or update of packaging_template_id,packaging_size_profile_v5_id,packaging_family_id,calculation_version/i);
});

test('S52-PKG-V5: competitor benchmarks stay with the exact pricing revision',()=>{
  assert.match(benchmarkScope,/add column if not exists template_id uuid/i);
  assert.match(benchmarkScope,/guard_packaging_v5_benchmark_revision/);
  assert.match(benchmarkScope,/s\.template_id=new\.template_id/);
  assert.match(benchmarkScope,/c\.template_id=new\.template_id/);
  assert.match(matrixActions,/template_id:templateId/);
  assert.match(matrixActions,/loadPricingContextV5\(organization\.id,templateId\)/);
  assert.match(matrixPage,/\.eq\('template_id',template\.id\)/);
  assert.match(matrixWorkspace,/name="template_id" value=\{template\.id\}/);
});

test('S52-PKG-V5: published templates are immutable and can be cloned into a new draft revision',()=>{
  assert.match(adminActions,/function requireDraftTemplate/);
  assert.match(adminActions,/data\.status!==['"]draft['"]/);
  assert.match(adminActions,/Published Pricing v5 is immutable/);
  assert.match(adminActions,/export async function clonePackagingTemplateRevisionV5/);
  assert.match(adminActions,/supersedes_template_id:source\.id/);
  assert.match(adminActions,/status:'draft'/);
  assert.match(adminActions,/status:'archived',is_active:false/);
  assert.match(adminWorkspace,/Create new revision/);
});

test('S52-PKG-V5: Admin can create a private custom construction but it starts non-quoteable',()=>{
  assert.match(adminActions,/export async function createPackagingConstructionV5/);
  assert.match(adminActions,/private_custom:true/);
  assert.match(adminActions,/is_quoteable:false/);
  assert.match(adminActions,/final construction layer must be a PE sealant material/i);
  assert.match(adminActions,/template_id:templateId/);
  assert.match(adminWorkspace,/Create private custom construction/);
  assert.match(adminWorkspace,/Create custom construction/);
});

test('S52-PKG-V5: Admin can maintain revision-scoped Charge Master overrides',()=>{
  assert.match(adminActions,/export async function savePackagingChargeRateV5/);
  assert.match(adminActions,/packaging_charge_master_family_links/);
  assert.match(adminWorkspace,/Pricing v5 Charge Master overrides/);
  assert.match(adminWorkspace,/Save charge/);
});

test('S52-PKG-V5: Stark seed preserves the exact 20 Sizes-sheet rows and PG01-PG05 assignments',()=>{
  const expected=[
    ['80x130_bg25_25',1],['98x150_bg30_30',1],
    ['110x170_bg30_30',2],['150x150_bg40_40',2],
    ['120x210_bg40_40',3],['125x210_bg40_40',3],['130x210_bg40_40',3],['140x210_bg40_40',3],['145x210_bg40_40',3],['150x220_bg50_50',3],['160x240_bg50_50',3],['170x250_bg50_50',3],['185x270_bg50_50',3],
    ['200x300_bg55_55',4],['210x300_bg55_55',4],['220x300_bg55_55',4],['230x310_bg55_55',4],['245x320_bg55_55',4],
    ['260x340_bg60_60',5],['280x360_bg60_60',5],
  ];
  for(const [key,bucket] of expected){
    assert.match(starkSeed,new RegExp("\\('"+key+"'[^\\n]+,"+bucket+"(?:::smallint)?,"),key+' must stay in PG0'+bucket);
  }
  assert.doesNotMatch(starkSeed,/\('160x230_bg50_50'/,'160x230 is a workbook formula example, not an approved Sizes-sheet row');
});

test('S52-PKG-V5: publish validation enforces workbook catalog and exact run-length schedules',()=>{
  assert.match(adminActions,/activeSizes\.length!==20/);
  assert.match(adminActions,/activeConstructions\.length<44/);
  assert.match(adminActions,/1:\[500,1000,2000,3000,5000,10000\]/);
  assert.match(adminActions,/2:\[250,500,1000,2000,3000,5000,10000\]/);
  assert.match(adminActions,/does not match the approved run-length schedule/);
});

test('S52-PKG-V5: v5 quote persistence has its own atomic RPC and snapshot namespace',()=>{
  assert.match(persistence,/app_save_packaging_v5_quote_line_tx/);
  assert.match(persistence,/'packaging_pricing_v5'/);
  assert.match(persistence,/calculation_version\s*=\s*5|calculation_version,5/i);
  assert.match(persistence,/security definer/i);
  assert.match(persistence,/grant execute[\s\S]*to service_role/i);
  assert.doesNotMatch(persistence,/app_save_packaging_v4_quote_line_tx/);
});

test('S52-PKG-V5: quote page keeps v4 as fallback unless v5 passes its own gates',()=>{
  assert.match(quotePage,/isPackagingPricingV5EnabledForOrg/);
  assert.match(quotePage,/if \(v5Enabled\)/);
  assert.match(quotePage,/if \(!pricingV5Options\)[\s\S]*isPackagingPricingV4EnabledForOrg/);
  assert.match(quotePage,/PricingV5SalesConfigurator/);
  assert.match(quotePage,/PricingV4SalesConfigurator/);
});

test('S52-PKG-V5: Sales option projection never returns raw master rates or commercial bands',()=>{
  assert.doesNotMatch(salesOptions,/current_rate\s*:/);
  assert.doesNotMatch(salesOptions,/wastage_pct\s*:/);
  assert.doesNotMatch(salesOptions,/margin_per_frame\s*:/);
  assert.match(salesOptions,/structure_label/);
});

test('S52-PKG-V5: Sales receives only safe allowed/blocked quantity rules for N/A enforcement',()=>{
  assert.match(salesOptions,/quantity_rules/);
  assert.match(salesOptions,/allowed_quantities/);
  assert.match(salesOptions,/blocked_quantities/);
  assert.doesNotMatch(salesOptions,/metadata:item\.metadata/);
});

test('S52-PKG-V5: separate gusset cannot receive zipper, pouching or a second margin',()=>{
  assert.match(engine,/charge\.code==='EXTRA_ZIPPER'&&!component\.apply_zipper/);
  assert.match(engine,/component\.apply_pouching/);
  assert.match(engine,/component\.apply_margin/);
});


test('S52-PKG-V5: Sales filters constructions by approved PE thickness and engine rejects invalid pairs',()=>{
  assert.match(salesOptions,/allowed_pe_microns/);
  assert.match(salesOptions,/pe_micron/);
  assert.match(salesConfigurator,/compatibleConstructions/);
  assert.match(salesConfigurator,/Approved PE/);
  assert.match(compatibility,/170x250_bg50_50':\[95\]/);
  assert.match(compatibility,/280x360_bg60_60':\[120\]/);
  assert.match(engine,/constructionAllowedForSizeV5/);
  assert.match(engine,/constructionCompatibilityErrorV5/);
});

test('S52-PKG-V5: Sales exposes only producible MOQ choices and Spot UV is manual snapshot-backed pricing',()=>{
  assert.match(salesConfigurator,/validQuantities/);
  assert.match(salesConfigurator,/Only producible quantities are selectable/);
  assert.match(salesOptions,/EXTRA_SPOT_UV/);
  assert.match(salesOptions,/pricing_mode:'manual'/);
  assert.match(salesConfigurator,/Spot UV — Manual Price/);
  assert.match(salesConfigurator,/manual_quote_charges/);
  assert.match(engine,/Spot UV automatic pricing is on hold/);
  assert.match(engine,/separate_quote_line/);
  assert.match(snapshot,/input:SupPricingInputV5/);
  assert.match(persistence,/p_internal_pricing/);
});
