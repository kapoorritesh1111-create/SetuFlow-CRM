import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const builder = readFileSync('src/features/setu-guru/external-discovery-campaign-builder.tsx', 'utf8');
const guidedWorkspace = readFileSync('src/features/setu-guru/external-discovery-workspace-guided.tsx', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
const page = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const route = readFileSync('src/app/api/setu-guru/external-discovery/campaigns/route.ts', 'utf8');
const campaignsLib = readFileSync('src/lib/setu-guru/external-discovery-campaigns.ts', 'utf8');
const migration = readFileSync('supabase/migrations/20260729211500_pr65_guided_external_discovery_campaign_scope.sql', 'utf8');

test('PR65 guided campaign builder exposes all five approved entry modes', () => {
  for (const value of ['saved_icp', 'new_market', 'lookalike', 'fresh_research', 'supplier_partner']) {
    assert.match(builder, new RegExp(value));
  }
  for (const label of ['Use a saved ICP', 'Same ICP, new market', 'Similar to a customer', 'Start new research', 'Find suppliers or partners']) {
    assert.match(builder, new RegExp(label));
  }
});

test('PR65 campaign builder has the five guided steps and business-first controls', () => {
  assert.match(builder, /\['Goal', 'Scope', 'Preferences', 'Review', 'Confirm'\]/);
  assert.match(builder, /Research direction/);
  assert.match(builder, /CRM and external research/);
  assert.match(builder, /Target market or country/);
  assert.match(builder, /Target company types/);
  assert.match(builder, /Source evidence required/);
  assert.match(builder, /Minimum fit score/);
  assert.match(builder, /Setu Guru understood/);
});

test('PR65 required fields block confirmation before campaign persistence', () => {
  for (const key of ['name', 'goal', 'market', 'product', 'targetTypes', 'resultLimit', 'minimumFit', 'evidenceRequirements', 'searchLanguages']) {
    assert.match(builder, new RegExp(`errors\\.${key}`));
  }
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
});

test('PR65 campaign API is organization scoped and rejects client-supplied scope fields', () => {
  assert.match(route, /requireWorkspace\(\)/);
  assert.match(route, /\.strict\(\)/);
  assert.doesNotMatch(route, /organizationId|organization_id|org_id/);
  assert.match(campaignsLib, /\.eq\('organization_id', orgId\)/);
  assert.match(campaignsLib, /org_id: orgId/);
});

test('PR65 schema migration is additive, indexed, and leaves RLS policies intact', () => {
  assert.match(migration, /add column if not exists campaign_mode/);
  assert.match(migration, /add column if not exists research_direction/);
  assert.match(migration, /add column if not exists scope_status/);
  assert.match(migration, /add column if not exists search_config jsonb/);
  assert.match(migration, /create index if not exists external_campaigns_org_scope_idx/);
  assert.doesNotMatch(migration, /drop table|drop column|delete from|truncate|disable row level security/i);
});

test('PR65 guided workspace is connected without removing existing Growth Center workspaces', () => {
  assert.match(guidedWorkspace, /ExternalDiscoveryCampaignBuilder/);
  assert.match(guidedWorkspace, /LegacyExternalDiscoveryWorkspace/);
  assert.match(growthCenter, /external-discovery-workspace-guided/);
  assert.match(growthCenter, /profiles=\{props\.icpProfiles \?\? \[\]\}/);
  assert.match(growthCenter, /crmOpportunities=\{opportunities\}/);
  assert.match(page, /listGuidedExternalDiscovery/);
  for (const preserved of ['Work Queue', 'Pricing Intelligence', 'Packaging Operations', 'CRM Matches', 'Trade Events']) {
    assert.match(growthCenter, new RegExp(preserved));
  }
});
