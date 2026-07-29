import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder = readFileSync('src/features/setu-guru/external-discovery-campaign-builder.tsx', 'utf8');
const guidedWorkspace = readFileSync('src/features/setu-guru/external-discovery-workspace-guided.tsx', 'utf8');
const premiumResults = readFileSync('src/features/setu-guru/external-discovery-premium-results.tsx', 'utf8');
const statusResolver = readFileSync('src/lib/setu-guru/external-discovery-status.ts', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
const page = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const route = readFileSync('src/app/api/setu-guru/external-discovery/campaigns/route.ts', 'utf8');
const campaignsLib = readFileSync('src/lib/setu-guru/external-discovery-campaigns.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260729211500_pr65_guided_external_discovery_campaign_scope.sql', 'utf8');

test('PR65 guided campaign builder exposes all five approved entry modes', () => {
  for (const value of ['saved_icp', 'new_market', 'lookalike', 'fresh_research', 'supplier_partner']) assert.match(builder, new RegExp(value));
  for (const label of ['Use a saved ICP', 'Same ICP, new market', 'Similar to a customer', 'Start new research', 'Find suppliers or partners']) assert.match(builder, new RegExp(label));
});

test('PR65 campaign builder has the five guided steps and business-first controls', () => {
  assert.match(builder, /\['Goal', 'Scope', 'Preferences', 'Review', 'Confirm'\]/);
  for (const marker of ['Research direction', 'CRM and external research', 'Target market or country', 'Target company types', 'Source evidence required', 'Minimum fit score', 'Setu Guru understood']) assert.match(builder, new RegExp(marker));
});

test('PR65 required fields block confirmation before campaign persistence', () => {
  for (const key of ['name', 'goal', 'market', 'product', 'targetTypes', 'resultLimit', 'minimumFit', 'evidenceRequirements', 'searchLanguages']) assert.match(builder, new RegExp(`errors\\.${key}`));
  assert.match(builder, /if \(!validate\(5\)\)/);
  assert.match(route, /target_countries: RequiredList/);
  assert.match(route, /products: RequiredList/);
  assert.match(route, /target_company_types: RequiredList/);
  assert.match(route, /status: 422/);
});

test('PR65 campaign market overrides the ICP without changing the saved profile', () => {
  assert.match(builder, /replaces .* for this campaign only/);
  assert.match(builder, /Your saved ICP will not be changed/);
  assert.match(campaignsLib, /resolved_target_countries: input\.searchConfig\.target_countries/);
  assert.match(campaignsLib, /saved_icp_target_countries: profile\?\.target_countries/);
  assert.doesNotMatch(campaignsLib, /from\('org_icp_profiles'\)\.update/);
  assert.doesNotMatch(campaignsLib, /from\('org_icp_profiles'\)\.delete/);
});

test('PR65 buyer and supplier targets remain separate in the campaign snapshot', () => {
  assert.match(campaignsLib, /buyer_types: buyerSide \? targetTypes : \[\]/);
  assert.match(campaignsLib, /supplier_types: supplierSide \? targetTypes : \[\]/);
  assert.match(campaignsLib, /Buyer and supplier targets are never combined/);
  assert.doesNotMatch(campaignsLib, /\.\.\.\(profile\?\.buyer_types.*\.\.\.\(profile\?\.supplier_types/s);
});

test('PR65 campaign creation saves scope only and never starts research automatically', () => {
  assert.doesNotMatch(builder, /external-discovery\/jobs/);
  assert.doesNotMatch(route, /runDiscoveryJob/);
  assert.doesNotMatch(campaignsLib, /runDiscoveryJob/);
  assert.match(route, /researchStarted: false/);
  assert.match(builder, /Saving the campaign does not start research, create a lead, or send outreach/);
  assert.match(builder, /separate Run research control/);
});

test('PR65 introduces no autonomous lead creation or outreach', () => {
  assert.doesNotMatch(campaignsLib, /from\('leads'\)\.insert/);
  assert.doesNotMatch(campaignsLib, /from\('communications'\)\.insert/);
  assert.doesNotMatch(campaignsLib, /sendOutreach|convertOpportunityToLead|cron|setInterval/);
  assert.match(campaignsLib, /approved_by_human: true/);
  assert.doesNotMatch(guidedWorkspace, /setInterval|cron|autoConvert|autoSend/);
});

test('PR65 campaign API is organization scoped and rejects client-supplied scope fields', () => {
  assert.match(route, /requireWorkspace\(\)/);
  assert.match(route, /\.strict\(\)/);
  const requestSchema = route.slice(route.indexOf('const CreateCampaignSchema'), route.indexOf('async function organizationId'));
  assert.doesNotMatch(requestSchema, /organizationId|organization_id|org_id/);
  assert.match(campaignsLib, /\.eq\('organization_id', orgId\)/);
  assert.match(campaignsLib, /org_id: orgId/);
});

test('PR65 schema migration is additive, indexed, and leaves RLS policies intact', () => {
  for (const marker of ['add column if not exists campaign_mode', 'add column if not exists research_direction', 'add column if not exists scope_status', 'add column if not exists search_config jsonb', 'create index if not exists external_campaigns_org_scope_idx']) assert.match(migration, new RegExp(marker));
  assert.doesNotMatch(migration, /drop table|drop column|delete from|truncate|disable row level security/i);
});

test('PR65 guided workspace is connected without removing existing Growth Center workspaces', () => {
  assert.match(guidedWorkspace, /ExternalDiscoveryCampaignBuilder/);
  assert.match(guidedWorkspace, /PremiumExternalDiscoveryResults/);
  assert.match(growthCenter, /external-discovery-workspace-guided/);
  assert.match(growthCenter, /profiles=\{props\.icpProfiles \?\? \[\]\}/);
  assert.match(growthCenter, /crmOpportunities=\{opportunities\}/);
  assert.match(page, /listGuidedExternalDiscovery/);
  for (const preserved of ['Work Queue', 'Pricing Intelligence', 'Packaging Operations', 'CRM Matches', 'Trade Events']) assert.match(growthCenter, new RegExp(preserved));
});

test('PR65 every provider outcome maps to a clear user-facing state and partial is outcome-only', () => {
  for (const outcome of ['completed_with_results', 'completed_no_matches', 'partial', 'provider_not_configured', 'scope_confirmation_required', 'failed']) assert.match(statusResolver, new RegExp(outcome));
  for (const label of ['Draft', 'Needs information', 'Ready to research', 'Researching', 'Completed with results', 'Completed — no qualified matches', 'Partially completed', 'Provider not configured', 'Scope confirmation required', 'Research failed']) assert.match(statusResolver, new RegExp(label));
  assert.match(statusResolver, /providerOutcome = campaignProviderOutcome/);
  assert.match(statusResolver, /fallback === 'partial'\) return state\('failed'\)/);
  assert.doesNotMatch(statusResolver.slice(statusResolver.indexOf("fallback === 'partial'")), /state\('partial'\)/);
});

test('PR65 campaign cards show resolved market, scope, diagnostics, and preserved provider messages', () => {
  for (const marker of ['Market actually searched', 'Saved ICP market', 'Campaign market', 'Resolved market', 'Provider message', 'Sources found', 'Rows returned', 'Rows accepted', 'Rows inserted', 'Rows rejected', 'Rejection reasons', 'Partial failures']) assert.match(guidedWorkspace, new RegExp(marker));
  assert.match(guidedWorkspace, /resolved_target_countries/);
  assert.match(guidedWorkspace, /setMessage\(payload\.result\?\.message/);
  assert.match(guidedWorkspace, /await onRefresh\(\)/);
  assert.doesNotMatch(guidedWorkspace, /window\.location\.reload/);
});

test('PR65 Bulgaria campaign market visibly overrides the UK ICP market', () => {
  assert.match(guidedWorkspace, /saved_icp_target_countries/);
  assert.match(guidedWorkspace, /resolved_target_countries/);
  assert.match(guidedWorkspace, /Saved ICP market/);
  assert.match(guidedWorkspace, /Campaign market/);
  assert.match(guidedWorkspace, /Resolved market/);
});

test('PR65 legacy mixed campaigns require scope confirmation and cannot run providers', () => {
  assert.match(statusResolver, /legacyCampaignHasMixedDirections/);
  assert.match(guidedWorkspace, /This campaign contains both buyer and supplier targets\. Choose one direction before running research\./);
  assert.match(guidedWorkspace, /display\.key !== 'scope_confirmation_required'/);
  assert.match(guidedWorkspace, /Edit and confirm scope/);
});

test('PR65 Run Research appears only for ready external scopes and CRM-only uses CRM Matches', () => {
  assert.match(guidedWorkspace, /campaign\.scope_status === 'ready'/);
  assert.match(guidedWorkspace, /sourceStrategy !== 'crm_only'/);
  assert.match(guidedWorkspace, /Start research/);
  assert.match(guidedWorkspace, /Open CRM Matches/);
  assert.match(guidedWorkspace, /providerKey: 'auto'/);
});

test('PR65 provider-not-configured is truthful and does not claim no market opportunities', () => {
  const section = statusResolver.slice(statusResolver.indexOf('provider_not_configured:'), statusResolver.indexOf('scope_confirmation_required:'));
  assert.match(section, /No external provider ran/);
  assert.match(section, /does not mean the market has no opportunities/);
  assert.doesNotMatch(section, /no opportunities exist|no market opportunities exist/i);
});

test('PR65 external result cards are evidence-first and clearly outside CRM', () => {
  for (const marker of ['External prospect', 'Outside CRM until approved', 'Why this company matches', 'Matched products', 'Matched industries', 'Key evidence', 'Suggested roles', 'Source URL', 'fit score']) assert.match(premiumResults, new RegExp(marker));
  assert.match(premiumResults, /source_evidence/);
  assert.match(premiumResults, /fit_reasons/);
  assert.match(premiumResults, /fit_penalties/);
  assert.match(premiumResults, /missing_data/);
  assert.match(premiumResults, /campaign_name/);
});

test('PR65 result drawer preserves explicit governance and opening it changes no state', () => {
  const opening = premiumResults.slice(premiumResults.indexOf('onClick={() => setActive(item)}'), premiumResults.indexOf('<GrowthReviewDrawer'));
  assert.doesNotMatch(opening, /fetch\(|review\(|convert\(|saveDraft\(|sendDraft\(/);
  for (const marker of ['Review actions', 'Convert to CRM', 'Outreach draft', 'Approve &amp; send', 'Follow-up', 'History and audit']) assert.match(premiumResults, new RegExp(marker));
  assert.match(premiumResults, /Conversion requires an explicit click/);
  assert.match(premiumResults, /Sending requires a separate explicit approval/);
});

test('PR65 CRM Matches and External Discovery remain separate', () => {
  assert.match(growthCenter, /operationsView === 'crm-matches'/);
  assert.match(growthCenter, /operationsView === 'external-discovery'/);
  assert.match(guidedWorkspace, /Internal CRM matches/);
  assert.match(guidedWorkspace, /External prospects/);
  assert.doesNotMatch(guidedWorkspace, /combined results|combine counts/i);
});
