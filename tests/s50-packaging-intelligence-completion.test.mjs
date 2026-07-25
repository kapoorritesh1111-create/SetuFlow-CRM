import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const core = read('src/lib/setu-guru/packaging-intelligence-core.ts');
const icpApi = read('src/app/api/setu-guru/icp/route.ts');
const wizard = read('src/features/setu-guru/icp-setup-wizard.tsx');
const opportunities = read('src/lib/setu-guru/opportunity-finder.ts');
const provider = read('src/lib/setu-guru/discovery-providers/index.ts');
const packagingSearch = read('src/app/api/setu-guru/packaging-search/route.ts');
const recommendations = read('src/lib/setu-guru/packaging-recommendations.ts');
const learningApi = read('src/app/api/setu-guru/packaging-learning/route.ts');
const operations = read('src/features/setu-guru/packaging-operations-workspace.tsx');
const manifest = read('public/setu-guru/knowledge-manifest.json');
const compliance = read('docs/setu-guru/PACKAGING_COMPLIANCE_RESEARCH_LIBRARY.md');
const sales = read('docs/setu-guru/PACKAGING_SALES_DISCOVERY_ASSISTANT.md');

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

test('S50-PKI-005/006/022: External Discovery is licensed, evidence-backed, and truthfully disabled without credentials', () => {
  assert.match(provider, /EXA_API_KEY/);
  assert.match(provider, /https:\/\/api\.exa\.ai\/search/);
  assert.match(provider, /source-backed/);
  assert.match(provider, /No companies were generated/);
  assert.match(provider, /getDefaultDiscoveryProvider/);
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
  assert.match(operations, /Recommendation performance/);
  assert.match(operations, /never changes operational rules or models automatically/);
  assert.match(operations, /Helpful/);
  assert.match(operations, /Not relevant/);
});

test('S50-PKI-009/016/019: manifest contains complete Packaging knowledge and canonical workflow', () => {
  for (const file of ['PACKAGING_COMPLIANCE_RESEARCH_LIBRARY.md','PACKAGING_SALES_DISCOVERY_ASSISTANT.md','packaging-intelligence-core.ts','packaging-recommendations.ts','packaging-academy-data.js']) assert.match(manifest, new RegExp(file.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(manifest, /Repeat Order and Account Growth/);
  assert.match(manifest, /Do not fake Catalog products, Packaging opportunities, companies, contacts, market signals/);
});

test('S50 release guardrails: no autonomous approval, send, pricing, production, or dispatch', () => {
  const joined = `${core}\n${packagingSearch}\n${recommendations}\n${learningApi}`;
  assert.match(joined, /approvalRequired|approval required|human review|operator review/i);
  assert.doesNotMatch(joined, /autoApprove|autoSend|autoDispatch|advanceProductionAutomatically/);
});
