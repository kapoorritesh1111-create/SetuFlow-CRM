import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const templates = read('src/lib/trial/templates.ts');
const provisioning = read('src/features/client-onboarding/server/provisioning.ts');
const trialRoute = read('src/app/(app)/trial/page.tsx');
const banner = read('src/features/trial/trial-workspace-banner.tsx');
const layout = read('src/app/(app)/layout.tsx');
const adminActions = read('src/features/client-management/server/actions.ts');
const adminPage = read('src/app/(app)/admin/client-management/page.tsx');
const migration = read('supabase/migrations/20260609013000_s24_trial_batch_workspace.sql');
const guruRegistry = read('src/lib/setu-guru/help-registry.ts');
const guruContext = read('src/lib/setu-guru/page-context.ts');
const pkg = JSON.parse(read('package.json'));

test('trial template registry covers guided trial and Stark Packmate scenarios', () => {
  for (const key of ['export_foods_basic', 'ingredient_trader', 'distributor_importer', 'packaging_converter']) {
    assert.match(templates, new RegExp(key));
  }
  for (const sku of ['PACKMATE-MAILER-CORR', 'PACKMATE-FOLD-CARTON', 'PACKMATE-SHIP-CARTON']) {
    assert.match(templates, new RegExp(sku));
  }
  assert.match(templates, /calculatePackmateDimensionalPrice/);
  assert.match(templates, /resolveTrialTemplateKeyForRequest/);
});

test('onboarding provisioning creates entitlement and safe trial seed data', () => {
  assert.match(provisioning, /seedTrialTemplateData/);
  assert.match(provisioning, /create_guided_trial_entitlement/);
  assert.match(provisioning, /product_categories/);
  assert.match(provisioning, /trial_template_key/);
  assert.match(provisioning, /guidedTrialError/);
});

test('guided trial route and banner are wired into authenticated workspace', () => {
  assert.match(trialRoute, /Guided Trial/);
  assert.match(trialRoute, /getTrialCapability/);
  assert.match(trialRoute, /calculatePackmateDimensionalPrice/);
  assert.match(banner, /TrialWorkspaceBanner/);
  assert.match(layout, /TrialWorkspaceBanner/);
});

test('admin client management exposes trial template and limit controls', () => {
  for (const field of ['trial_template_key', 'guided_mode_enabled', 'max_leads', 'max_quotes', 'max_orders', 'max_users']) {
    assert.match(adminActions, new RegExp(field));
    assert.match(adminPage, new RegExp(field));
  }
  assert.match(adminPage, /Packaging converter/);
});

test('live migration aligns capability RPC, enforcement, and Packmate pricing helper', () => {
  for (const field of ['trial_ends_at', 'lead_count', 'quote_count', 'order_count', 'active_user_count', 'remaining_leads']) {
    assert.match(migration, new RegExp(field));
  }
  assert.match(migration, /drop function if exists public\.get_trial_capability\(uuid\) cascade/i);
  assert.match(migration, /calculate_stark_packmate_dimensional_price/);
  assert.match(migration, /create_guided_trial_entitlement/);
  assert.match(migration, /s24_trial_194_enforce_lead_limit/);
});

test('Setu Guru has trial workspace help and Packmate routing', () => {
  assert.match(guruContext, /makeContext\('trial'/);
  assert.match(guruRegistry, /Guided trial workspace help/);
  assert.match(guruRegistry, /Stark Packmate/);
  assert.match(guruRegistry, /'\/trial'/);
});

test('batch regression is wired into npm test', () => {
  assert.match(pkg.scripts.test, /tests\/s24-trial-batch-workspace\.test\.mjs/);
});
