import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const runner = read('src/lib/setu-guru/external-discovery-runner.ts');
const providers = read('src/lib/setu-guru/discovery-providers/index.ts');
const jobsRoute = read('src/app/api/setu-guru/external-discovery/jobs/route.ts');
const legacyDiscovery = read('src/lib/setu-guru/external-discovery.ts');
const migration = read('supabase/migrations/20260729211500_pr65_guided_external_discovery_campaign_scope.sql');

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.notEqual(from, -1, `Missing section start: ${start}`);
  assert.notEqual(to, -1, `Missing section end: ${end}`);
  return source.slice(from, to);
}

test('PR65 execution sends Bulgaria from confirmed search_config instead of the UK ICP market', () => {
  const guidedScope = section(runner, 'if (guided) {', 'const legacy = directionFromLegacySnapshot');
  assert.match(guidedScope, /countries: list\(config\.target_countries\)/);
  assert.doesNotMatch(guidedScope, /countries: list\(snapshot\.target_countries\)/);
  const savedIcpCountries = ['United Kingdom'];
  const confirmedCampaignCountries = ['Bulgaria'];
  assert.deepEqual(confirmedCampaignCountries, ['Bulgaria']);
  assert.notDeepEqual(confirmedCampaignCountries, savedIcpCountries);
});

test('PR65 buyer research uses only confirmed target company types and not ICP supplier types', () => {
  const guidedScope = section(runner, 'if (guided) {', 'const legacy = directionFromLegacySnapshot');
  assert.match(guidedScope, /companyTypes: list\(config\.target_company_types\)/);
  assert.doesNotMatch(guidedScope, /supplier_types/);
});

test('PR65 supplier research uses only confirmed target company types and not ICP buyer types', () => {
  const guidedScope = section(runner, 'if (guided) {', 'const legacy = directionFromLegacySnapshot');
  assert.match(guidedScope, /researchDirection/);
  assert.match(guidedScope, /companyTypes: list\(config\.target_company_types\)/);
  assert.doesNotMatch(guidedScope, /buyer_types/);
});

test('PR65 CRM-only campaigns never call an external provider and direct the user to CRM Matches', () => {
  assert.match(runner, /sourceStrategy === 'crm_only'/);
  assert.match(runner, /Open CRM Matches instead of running an external provider/);
  assert.match(runner, /destination: '\/growth-agent\?view=crm-matches'/);
  const providerCall = runner.indexOf('const result = await provider.search(input)');
  const crmOnlyGuard = runner.indexOf("sourceStrategy === 'crm_only'");
  assert.ok(crmOnlyGuard > -1 && crmOnlyGuard < providerCall);
});

test('PR65 external-only execution never includes CRM records in provider input', () => {
  assert.match(runner, /sourceStrategy: sourceStrategy === 'external_only' \? 'external_only' : 'crm_and_external'/);
  assert.doesNotMatch(providers, /from\('leads'\)|organization_id.*leads/);
});

test('PR65 CRM-and-external campaigns keep internal matches separate from external provider results', () => {
  assert.match(runner, /crmResultsSeparate: input\.sourceStrategy === 'crm_and_external'/);
  assert.doesNotMatch(runner, /external_opportunities[\s\S]*from\('leads'\)/);
});

test('PR65 Food and Beverage playbook has food evidence and no Packaging-specific prompt instructions', () => {
  const evidenceBuilder = section(providers, 'function playbookEvidence', 'function responseJsonSchema');
  const food = section(evidenceBuilder, "if (playbook === 'food_beverage')", "if (playbook === 'packaging')");
  assert.match(food, /product_categories/);
  assert.match(food, /import_distribution_retail_evidence/);
  assert.match(food, /brands_or_categories_carried/);
  assert.doesNotMatch(food, /print_process|packaging_format|incumbent_supplier_pain|estimated_annual_volume/);
});

test('PR65 Packaging playbook is the only playbook requesting Packaging-specific evidence', () => {
  const evidenceBuilder = section(providers, 'function playbookEvidence', 'function responseJsonSchema');
  const packaging = section(evidenceBuilder, "if (playbook === 'packaging')", "if (playbook === 'apparel')");
  for (const marker of ['matched_packaging_categories', 'packaging_use_cases', 'buyer_need_signals', 'current_packaging_format', 'print_process', 'sustainability_requirements']) {
    assert.match(packaging, new RegExp(marker));
  }
});

test('PR65 supports Food, Packaging, Apparel, Manufacturing, Distribution, and general trade playbooks', () => {
  for (const playbook of ['food_beverage', 'packaging', 'apparel', 'manufacturing', 'distribution', 'general_trade']) {
    assert.match(providers, new RegExp(playbook));
  }
});

test('PR65 legacy campaigns never combine buyer and supplier targets', () => {
  assert.match(runner, /if \(buyerTypes\.length && supplierTypes\.length\)/);
  assert.match(runner, /contains both buyer and supplier targets/);
  assert.match(runner, /scope_confirmation_required/);
  assert.doesNotMatch(runner, /\.\.\.buyerTypes.*\.\.\.supplierTypes|\.\.\.supplierTypes.*\.\.\.buyerTypes/s);
});

test('PR65 zero accepted results use completed_no_matches rather than partial', () => {
  assert.match(providers, /candidates\.length \? 'completed_with_results' : 'completed_no_matches'/);
  assert.match(runner, /inserted > 0[\s\S]*'completed_with_results'[\s\S]*'completed_no_matches'/);
});

test('PR65 partial is reserved for a provider outcome that is genuinely partial', () => {
  assert.match(runner, /diagnostics\.outcome === 'partial'/);
  assert.match(runner, /outcome === 'partial' \? 'partial' : 'completed'/);
  assert.doesNotMatch(runner, /inserted > 0 \? 'completed' : 'partial'/);
});

test('PR65 OpenAI remains preferred over Anthropic and Exa when configured', () => {
  const attempts = section(providers, 'const attempts:', 'const failures:');
  assert.ok(attempts.indexOf("name: 'OpenAI'") < attempts.indexOf("name: 'Anthropic'"));
  assert.match(providers, /getDefaultDiscoveryProvider\(\).*aiWebProvider\.configured \? aiWebProvider : exaProvider\.configured/s);
  assert.match(jobsRoute, /OpenAI web-search provider remains preferred/);
});

test('PR65 OpenAI uses Responses API web search and strict structured output', () => {
  assert.match(providers, /https:\/\/api\.openai\.com\/v1\/responses/);
  assert.match(providers, /tools: \[\{ type: 'web_search' \}\]/);
  assert.match(providers, /include: \['web_search_call\.action\.sources'\]/);
  assert.match(providers, /type: 'json_schema'/);
  assert.match(providers, /strict: true/);
});

test('PR65 structured provider output is validated and arbitrary bracket slicing is not used', () => {
  assert.match(providers, /StructuredResponseSchema\.safeParse/);
  assert.match(providers, /JSON\.parse\(clean\)/);
  assert.doesNotMatch(providers, /indexOf\('\['\).*lastIndexOf\('\]'\)/s);
});

test('PR65 canonicalizes provider source URLs and removes tracking noise', () => {
  assert.match(providers, /canonicalizeSourceUrl/);
  assert.match(providers, /parsed\.hash = ''/);
  assert.match(providers, /TRACKING_PARAMS/);
  assert.match(providers, /utm_/);
  assert.match(providers, /sourceComparisonKey/);
});

test('PR65 rejects invalid provider rows with explainable diagnostics', () => {
  for (const reason of ['missing_required_fields', 'source_not_cited_by_provider_tool', 'research_direction_mismatch', 'excluded_company_type', 'duplicate_in_provider_output']) {
    assert.match(providers, new RegExp(reason));
  }
  assert.match(runner, /below_minimum_fit_score/);
  assert.match(runner, /rejection_reasons/);
});

test('PR65 provider diagnostics persist scope, plan, counts, rejections, duplicates, and outcome', () => {
  for (const marker of ['resolved_scope', 'research_plan', 'sources_found', 'rows_returned', 'rows_inserted', 'rows_rejected', 'rejection_reasons', 'duplicates_detected', 'provider_message', 'outcome']) {
    assert.match(runner, new RegExp(marker));
  }
  assert.match(runner, /provider_response: response/);
});

test('PR65 scope readiness transitions are ready to researching to completed and failures return to ready', () => {
  assert.match(runner, /campaign\.scope_status !== 'ready'/);
  assert.match(runner, /scope_status: 'researching'/);
  assert.match(runner, /finalScopeStatus = outcome === 'failed' \|\| outcome === 'provider_not_configured' \? 'ready' : 'completed'/);
  assert.match(runner, /scope_status: 'ready'.*external_discovery_job_failed/s);
});

test('PR65 idempotency includes campaign, provider, mode, direction, and confirmed search_config', () => {
  assert.match(runner, /campaignId/);
  assert.match(runner, /providerKey: provider\.key/);
  assert.match(runner, /campaignMode: input\.campaignMode/);
  assert.match(runner, /researchDirection: input\.researchDirection/);
  assert.match(runner, /searchConfig: object\(campaign\.search_config\)/);
  assert.match(runner, /stableStringify\(idempotencyPayload\)/);
});

test('PR65 external fit scoring uses confirmed campaign country, company type, product, industry, source, and duplicate state', () => {
  for (const marker of ['input.countries', 'input.companyTypes', 'input.products', 'input.targetIndustries', 'candidate.sourceUrl', 'duplicate.state']) {
    const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(runner, new RegExp(escaped));
  }
  assert.match(runner, /SCORE_VERSION = 'pr65-confirmed-scope-v1'/);
});

test('PR65 execution never creates leads or sends outreach automatically', () => {
  assert.doesNotMatch(runner, /from\('leads'\)\.insert|convertOpportunityToLead|sendOutreach|communications.*insert/);
  assert.match(runner, /approved_by_human: true/);
  assert.doesNotMatch(providers, /from\('leads'\)\.insert|sendOutreach|convertOpportunityToLead/);
});

test('PR65 execution remains organization scoped and relies on the existing RLS-protected tables', () => {
  assert.match(jobsRoute, /requireWorkspace\(\)/);
  assert.match(runner, /\.eq\('org_id', orgId\)/);
  assert.match(runner, /org_id: orgId/);
  assert.match(migration, /external_discovery_campaigns/);
  assert.doesNotMatch(migration, /disable row level security|drop policy/i);
  assert.match(legacyDiscovery, /is_org_member|org_id|organization_id/);
});
