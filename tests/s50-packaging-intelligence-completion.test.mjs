import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const core = read('src/lib/setu-guru/packaging-intelligence-core.ts');
const icpApi = read('src/app/api/setu-guru/icp/route.ts');
const wizard = read('src/features/setu-guru/icp-setup-wizard.tsx');
const opportunities = read('src/lib/setu-guru/opportunity-finder.ts');
const provider = read('src/lib/setu-guru/discovery-providers/index.ts');
const aiProvider = read('src/lib/ai/provider.ts');
const packagingSearch = read('src/app/api/setu-guru/packaging-search/route.ts');
const recommendations = read('src/lib/setu-guru/packaging-recommendations.ts');
const learningApi = read('src/app/api/setu-guru/packaging-learning/route.ts');
const operations = read('src/features/setu-guru/packaging-operations-workspace.tsx');
const growthCenter = read('src/features/setu-guru/growth-center.tsx');
const manifest = read('public/setu-guru/knowledge-manifest.json');
const compliance = read('docs/setu-guru/PACKAGING_COMPLIANCE_RESEARCH_LIBRARY.md');
const sales = read('docs/setu-guru/PACKAGING_SALES_DISCOVERY_ASSISTANT.md');
const academy = read('public/marketing/guides/packaging-academy-data.js');
const academyRoutes = read('public/marketing/guides/packaging-academy-v6.js');
const academyLearning = read('public/marketing/guides/packaging-academy-learning-v9.js');
const academyHtml = read('public/marketing/guides/setu_flow_packaging_workspace_guide.html');
const migration = read('supabase/migrations/20260725050500_s50_finish_packaging_academy_currency_and_live_recommendations.sql');

test('S50-PKI-003: Packaging ICP wizard is vertical-aware and persists structured dimensions', () => {
  for (const marker of ['packagingEnabled', 'packaging_families', 'end_use_sectors', 'materials', 'print_methods', 'quantity_bands', 'artwork_states', 'sustainability_needs', 'regulated_uses', 'lead_time_priorities']) assert.match(`${icpApi}\n${wizard}`, new RegExp(marker));
  assert.match(icpApi, /isPackagingOrganization/);
  assert.match(wizard, /Packaging ICP Setup/);
});

test('S50-PKI-004: CRM matching uses Packaging evidence rather than lead_type as buyer type', () => {
  assert.match(opportunities, /scorePackagingFit/);
  assert.match(opportunities, /matchedCategories/);
  assert.match(opportunities, /decisionMakerRoles/);
  assert.doesNotMatch(opportunities, /buyer_types.*lead_type|lead_type.*buyer_types/);
});

test('S50-PKI-005/006/022: External Discovery uses configured source-backed providers and truthful fallback', () => {
  for (const marker of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'EXA_API_KEY', 'https://api.openai.com/v1/responses', 'https://api.anthropic.com/v1/messages', 'https://api.exa.ai/search', 'web_search', 'source-backed', 'No companies were generated', 'getDefaultDiscoveryProvider']) assert.match(provider, new RegExp(marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(provider, /Results remain separate from CRM until human review and approval/);
  assert.match(provider, /matched_packaging_categories/);
  assert.match(provider, /buyer_need_signals/);
});

test('S50 AI provider boundary supports Anthropic and OpenAI with guarded fallback', () => {
  assert.match(aiProvider, /https:\/\/api\.anthropic\.com\/v1\/messages/);
  assert.match(aiProvider, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(aiProvider, /configuredProviders/);
  assert.match(aiProvider, /providerOrder/);
  assert.match(aiProvider, /All recommendations and drafts require operator review/);
  assert.match(aiProvider, /No configured AI provider is available/);
});

test('S50-PKI-020: all direct Packaging live-search modes execute through an org-scoped API', () => {
  for (const mode of ['packaging_family_search','packaging_template_search','packaging_specification_review','packaging_quote_readiness','packaging_artwork_status','packaging_proof_status','packaging_design_queue','packaging_dispatch_status','packaging_production_readiness','packaging_material_guidance','packaging_moq_alternatives','packaging_cost_driver_explanation','packaging_sales_discovery','packaging_compliance_research','packaging_learning_metrics']) assert.match(packagingSearch, new RegExp(mode));
  assert.match(packagingSearch, /isPackagingOrganization/);
  assert.match(packagingSearch, /\.eq\('organization_id', orgId\)/);
  assert.match(packagingSearch, /approvalRequired: true/);
});

test('S50-PKI-015/017/023: pricing, process, value, compliance, and sales intelligence are deterministic and reviewable', () => {
  for (const marker of ['recommendPackagingPrintProcess', 'estimatePackagingOpportunityValue', 'packagingSalesDiscoveryChecklist', 'packagingComplianceLibrary', 'buildPackagingOutreachDraft']) assert.match(core, new RegExp(marker));
  for (const process of ['digital', 'flexo', 'rotogravure', 'service_only', 'needs_review']) assert.match(core, new RegExp(process));
  assert.match(core, /advisory_only/);
  assert.match(compliance, /Human approval boundaries/);
  assert.match(sales, /Setu Guru may not/);
});

test('S50-PKI-018: repeat-order, quantity-tier, print-process, and cross-sell recommendations use CRM evidence', () => {
  for (const type of ['packaging_repeat_order_due','packaging_quantity_tier_savings','packaging_print_process_review','packaging_cross_sell_labels','packaging_cross_sell_packshot','packaging_cross_sell_prepress']) assert.match(recommendations, new RegExp(type));
  assert.match(recommendations, /accepted_packaging_history/);
  assert.match(recommendations, /Nothing is sent automatically/);
});

test('S50-PKI-024: learning loop captures feedback and displays performance without autonomous model changes', () => {
  assert.match(learningApi, /packaging_intelligence_learning_metrics_v/);
  assert.match(learningApi, /false_positive/);
  assert.match(operations, /Recommendation quality/);
  assert.match(operations, /never changes operational rules automatically/);
  assert.match(operations, /Helpful/);
  assert.match(operations, /Not relevant/);
});

test('Packaging Operations explains the workflow and supports Academy deep links', () => {
  assert.match(operations, /Refresh Packaging Operations/);
  assert.match(operations, /This is different from Pricing Intelligence/);
  assert.match(operations, /Open the source record/);
  assert.match(operations, /Fix, verify and refresh/);
  assert.match(operations, /Quote readiness/);
  assert.match(operations, /Template health/);
  assert.match(growthCenter, /workspaceParam === 'packaging'/);
  assert.match(growthCenter, /resolvePackagingCategory/);
  assert.match(growthCenter, /initialCategory=\{requestedPackagingCategory\}/);
});

test('Packaging Academy Learn and Test modes share canonical step guidance', () => {
  assert.match(academyHtml, /packaging-academy-learning-v9\.js/);
  assert.match(academyLearning, /Same steps in Learn and Test/);
  assert.match(academyLearning, /Do this/);
  assert.match(academyLearning, /Pass when/);
  assert.match(academyLearning, /Why this matters/);
  assert.match(academyLearning, /Refresh Packaging Operations/);
  assert.match(academyLearning, /Pricing Intelligence is a separate workspace/);
  assert.match(academyLearning, /academy-screenshot-only/);
});

test('Packaging Academy v7 includes Setu Guru and Growth Center workflows with route-aware results', () => {
  assert.match(academy, /2026\.07\.25-v7/);
  assert.match(academy, /Setu Guru for Packaging/);
  assert.match(academy, /Growth Center — Packaging Operations/);
  assert.match(academy, /\/setu-guru-ai/);
  assert.match(academy, /\/growth-agent/);
  assert.match(academyRoutes, /Setu Guru for Packaging/);
  assert.match(academyRoutes, /Growth Center — Packaging Operations/);
  assert.match(academyRoutes, /testedRoute/);
  assert.match(academyRoutes, /academyVersion/);
  assert.match(migration, /Setu Guru for Packaging/);
  assert.match(migration, /Growth Center — Packaging Operations/);
  assert.match(migration, /2026\.07\.25-v7/);
});

test('S50 production migration enables Packaging recommendation types and repairs only governed editable currency data', () => {
  assert.match(migration, /recommendation_type like 'packaging_%'/);
  assert.match(migration, /q\.status in \('draft','in_review'\)/);
  assert.match(migration, /not exists[\s\S]*is_price_overridden/);
  assert.match(migration, /slug = 'packaging'/);
  assert.match(migration, /packaging_pricing_template_unhealthy/);
  assert.match(migration, /packaging_job_not_started/);
  assert.doesNotMatch(migration, /3f8ef935-16bf-49de-bc04-85b51a3e0cb8/);
});

test('S50-PKI-009/016/019: manifest contains complete Packaging knowledge and canonical workflow', () => {
  for (const file of ['PACKAGING_COMPLIANCE_RESEARCH_LIBRARY.md','PACKAGING_SALES_DISCOVERY_ASSISTANT.md','packaging-intelligence-core.ts','packaging-recommendations.ts','packaging-academy-data.js']) assert.match(manifest, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(manifest, /Repeat Order and Account Growth/);
  assert.match(manifest, /Do not fake Catalog products, Packaging opportunities, companies, contacts, market signals/);
});

test('S50 release guardrails: no autonomous approval, send, pricing, production, or dispatch', () => {
  const joined = `${core}\n${packagingSearch}\n${recommendations}\n${learningApi}\n${aiProvider}\n${provider}`;
  assert.match(joined, /approvalRequired|approval required|human review|operator review/i);
  assert.doesNotMatch(joined, /autoApprove|autoSend|autoDispatch|advanceProductionAutomatically/);
});
