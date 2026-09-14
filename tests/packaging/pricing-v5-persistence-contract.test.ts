import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const schema=fs.readFileSync('supabase/migrations/20260914013000_s52_pkg_v5_schema.sql','utf8');
const persistence=fs.readFileSync('supabase/migrations/20260914013300_s52_pkg_v5_quote_persistence.sql','utf8');
const quotePage=fs.readFileSync('src/app/(app)/leads/[leadId]/quote/page.tsx','utf8');
const salesOptions=fs.readFileSync('src/lib/packaging-pricing-v5/sales-options.ts','utf8');
const engine=fs.readFileSync('src/lib/packaging-pricing-v5/sup-formula-engine.ts','utf8');

test('S52-PKG-V5: v5 uses isolated tables and a separate disabled feature flag',()=>{
  assert.match(schema,/create table if not exists public\.packaging_size_profiles_v5/i);
  assert.match(schema,/create table if not exists public\.packaging_constructions_v5/i);
  assert.match(schema,/create table if not exists public\.packaging_pricing_commercial_bands_v5/i);
  assert.match(schema,/'packaging_pricing_v5'/);
  assert.match(schema,/false\s*,\s*0\s*,\s*array\['b97913cb-3b95-4247-8ced-ffdc0d392d2a'/i);
  assert.doesNotMatch(schema,/update\s+public\.smc_feature_flags[\s\S]*flag_key\s*=\s*'packaging_pricing_v4'/i);
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

test('S52-PKG-V5: separate gusset cannot receive zipper, pouching or a second margin',()=>{
  assert.match(engine,/charge\.code==='EXTRA_ZIPPER'&&!component\.apply_zipper/);
  assert.match(engine,/component\.apply_pouching/);
  assert.match(engine,/component\.apply_margin/);
});
