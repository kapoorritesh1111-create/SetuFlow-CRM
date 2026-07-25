import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

const icpApi = read('src/app/api/setu-guru/icp/route.ts');
const icpWizard = read('src/features/setu-guru/icp-setup-wizard.tsx');
const core = read('src/lib/setu-guru/packaging-intelligence-core.ts');
const opportunities = read('src/lib/setu-guru/opportunity-finder.ts');
const providers = read('src/lib/setu-guru/discovery-providers/index.ts');
const jobs = read('src/app/api/setu-guru/external-discovery/jobs/route.ts');
const packagingSearch = read('src/app/api/setu-guru/packaging-search/route.ts');
const recommendations = read('src/lib/setu-guru/packaging-recommendations.ts');
const learningApi = read('src/app/api/setu-guru/packaging-learning/route.ts');
const operations = read('src/features/setu-guru/packaging-operations-workspace.tsx');
const compliance = read('docs/setu-guru/PACKAGING_COMPLIANCE_RESEARCH_LIBRARY.md');
const pageContext = read('src/lib/setu-guru/page-context.ts');
const migration = read('supabase/migrations/20260725043000_s50_packaging_intelligence_completion.sql');

test('S50 ICP wizard is Packaging vertical aware and persists structured dimensions', () => {
  assert.match(icpApi, /isPackagingOrganization/);
  assert.match(icpApi, /vertical_profile/);
  assert.match(icpWizard, /Packaging ICP Setup/);
  for (const marker of ['packaging_families', 'end_use_sectors', 'materials', 'print_methods', 'quantity_bands', 'artwork_states', 'sustainability_needs', 'regulated_uses', 'services', 'lead_time_priorities']) assert.match(icpWizard, new RegExp(marker));
  assert.match(icpWizard, /id: form\.id/);
});

test('S50 CRM fit scoring uses Packaging evidence rather than lead_type as buyer type', () => {
  assert.match(opportunities, /scorePackagingFit/);
  assert.match(opportunities, /industry_metadata\?\.company_type/);
  assert.match(opportunities, /matchedCategories/);
  assert.doesNotMatch(opportunities, /lead_type.*buyer_types/);
  assert.match(core, /Packaging family or service need/);
  assert.match(core, /decisionMakerRoles/);
  assert.match(core, /buyerNeedSignals/);
});

test('S50 licensed provider is env-gated, source-backed, and never invents contacts', () => {
  assert.match(providers, /EXA_API_KEY/);
  assert.match(providers, /https:\/\/api\.exa\.ai\/search/);
  assert.match(providers, /sourceUrl/);
  assert.match(providers, /contacts: \[\]/);
  assert.match(providers, /human verification/);
  assert.match(jobs, /getDefaultDiscoveryProvider/);
  assert.match(jobs, /licensedProviderReady/);
});

test('S50 direct Packaging live-search modes cover pricing, design, production, compliance, sales, and learning', () => {
  for (const mode of ['packaging_family_search','packaging_template_search','packaging_specification_review','packaging_quote_readiness','packaging_artwork_status','packaging_proof_status','packaging_design_queue','packaging_dispatch_status','packaging_production_readiness','packaging_material_guidance','packaging_moq_alternatives','packaging_cost_driver_explanation','packaging_sales_discovery','packaging_compliance_research','packaging_learning_metrics']) assert.match(packagingSearch, new RegExp(mode));
  assert.match(packagingSearch, /isPackagingOrganization/);
  assert.match(pageContext, /packaging_quote_readiness/);
});

test('S50 pricing, process, value, sales discovery, and compliance intelligence are review-only', () => {
  assert.match(core, /recommendPackagingPrintProcess/);
  assert.match(core, /estimatePackagingOpportunityValue/);
  assert.match(core, /packagingSalesDiscoveryChecklist/);
  assert.match(core, /packagingComplianceLibrary/);
  assert.match(core, /approvalRequired: true/);
  assert.match(compliance, /Human approval boundaries/);
  assert.match(compliance, /current official sources/);
});

test('S50 repeat-order, cross-sell, tier, and print-process recommendations are generated', () => {
  for (const marker of ['packaging_repeat_order_due','packaging_quantity_tier_savings','packaging_cross_sell_labels','packaging_cross_sell_packshot','packaging_cross_sell_prepress','packaging_inactive_buyer_reactivation','packaging_print_process_review']) assert.match(recommendations, new RegExp(marker));
  assert.match(recommendations, /isPackagingOrganization/);
});

test('S50 learning loop records explicit feedback without autonomous model changes', () => {
  assert.match(learningApi, /packaging_intelligence_learning_metrics_v/);
  assert.match(learningApi, /packaging_intelligence_feedback/);
  assert.match(operations, /Recommendation performance/);
  assert.match(operations, /false_positive/);
  assert.match(operations, /never changes operational rules or models automatically/);
});

test('S50 migration enforces tenant isolation and evidence-rich discovery fields', () => {
  for (const marker of ['matched_packaging_categories','packaging_use_cases','buyer_need_signals','decision_maker_roles','estimated_value_low','estimated_value_high','print_process_recommendation','packaging_intelligence_feedback','packaging_intelligence_events','packaging_intelligence_learning_metrics_v']) assert.match(migration, new RegExp(marker));
  assert.match(migration, /enable row level security/);
  assert.match(migration, /is_org_member\(organization_id\)/);
  assert.match(migration, /security_invoker = true/);
});

test('S50 approval guardrails prohibit autonomous operational actions', () => {
  const combined = [core, providers, packagingSearch, operations, compliance].join('\n');
  for (const marker of ['human', 'approval', 'automatically']) assert.match(combined.toLowerCase(), new RegExp(marker));
  assert.doesNotMatch(packagingSearch, /\.update\(\{[^}]*stage/);
  assert.doesNotMatch(packagingSearch, /\.insert\([^)]*leads/);
});
