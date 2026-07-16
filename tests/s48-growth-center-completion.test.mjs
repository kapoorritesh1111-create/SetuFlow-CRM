import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const baseMigration = readFileSync('supabase/migrations/20260715190000_s48_growth_011_external_discovery.sql', 'utf8');
const completionMigration = readFileSync('supabase/migrations/20260716120000_s48_growth_012_opportunity_lifecycle_and_conversion.sql', 'utf8');
const icpMigration = readFileSync('supabase/migrations/20260715170000_s48_growth_001_versioned_icp_profiles.sql', 'utf8');
const discoveryLib = readFileSync('src/lib/setu-guru/external-discovery.ts', 'utf8');
const opportunityFinder = readFileSync('src/lib/setu-guru/opportunity-finder.ts', 'utf8');
const providerRegistry = readFileSync('src/lib/setu-guru/discovery-providers/index.ts', 'utf8');
const campaignsRoute = readFileSync('src/app/api/setu-guru/external-discovery/campaigns/route.ts', 'utf8');
const jobsRoute = readFileSync('src/app/api/setu-guru/external-discovery/jobs/route.ts', 'utf8');
const reviewRoute = readFileSync('src/app/api/setu-guru/external-discovery/review/route.ts', 'utf8');
const convertRoute = readFileSync('src/app/api/setu-guru/external-discovery/convert/route.ts', 'utf8');
const outreachRoute = readFileSync('src/app/api/setu-guru/external-discovery/outreach/route.ts', 'utf8');
const crmMatchesOutreachRoute = readFileSync('src/app/api/setu-guru/crm-matches/outreach/route.ts', 'utf8');
const crmMatchesWorkspace = readFileSync('src/features/setu-guru/crm-matches-workspace.tsx', 'utf8');
const externalDiscoveryWorkspace = readFileSync('src/features/setu-guru/external-discovery-workspace.tsx', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
const growthAgentPage = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');

test('S48-GROWTH-011/012: base external discovery schema is organization scoped with RLS on every table', () => {
  const tables = ['external_discovery_campaigns', 'external_discovery_jobs', 'external_opportunities', 'external_opportunity_contacts', 'external_opportunity_history'];
  for (const t of tables) {
    assert.match(baseMigration, new RegExp(`create table if not exists public\\.${t}[\\s\\S]*?org_id uuid not null references public\\.organizations`));
    assert.match(baseMigration, new RegExp(`alter table public\\.${t} enable row level security`));
  }
  assert.match(baseMigration, /is_org_member\(org_id\)/);
  assert.match(baseMigration, /unique \(org_id, idempotency_key\)/);
});

test('S48-GROWTH-012: completion migration only adds/reconciles columns and never drops production data', () => {
  assert.doesNotMatch(completionMigration, /drop table/i);
  assert.doesNotMatch(completionMigration, /delete from/i);
  assert.doesNotMatch(completionMigration, /truncate/i);
  assert.match(completionMigration, /add column if not exists/i);
  assert.match(completionMigration, /create index if not exists/i);
});

test('S48-GROWTH-012/020: the conversion RPC is organization scoped, idempotent, and requires an approved review state', () => {
  assert.match(completionMigration, /create or replace function public\.app_convert_external_opportunity_to_lead/);
  assert.match(completionMigration, /security definer/);
  assert.match(completionMigration, /if not public\.is_org_member\(p_org_id\) then/);
  assert.match(completionMigration, /if v_opportunity\.converted_lead_id is not null then/);
  assert.match(completionMigration, /return query select v_opportunity\.converted_lead_id, true/);
  assert.match(completionMigration, /if v_opportunity\.review_status not in \('approved', 'outreach_ready'\) then/);
  assert.match(completionMigration, /p_lead_type not in \('buyer', 'supplier'\)/);
  assert.match(completionMigration, /grant execute on function public\.app_convert_external_opportunity_to_lead/);
});

test('S48-GROWTH-012: communications table can now hold external-opportunity drafts without weakening its existing statuses', () => {
  assert.match(completionMigration, /add column if not exists external_opportunity_id uuid references public\.external_opportunities/);
  assert.match(completionMigration, /'lead','quote','rfq','trade_event_entry','external_opportunity','other'/);
});

test('S48-GROWTH-013: the discovery provider registry never fabricates results when unconfigured', () => {
  assert.match(providerRegistry, /disabled: true/);
  assert.match(providerRegistry, /candidates: \[\]/);
  assert.match(providerRegistry, /No production external discovery provider is configured/);
  assert.doesNotMatch(providerRegistry, /companyName: ['"`](?!.*\$)/); // no hardcoded fake company literal
});

test('S48-GROWTH-013/011: runDiscoveryJob is idempotent per campaign+provider+ICP snapshot and never writes to leads', () => {
  assert.match(discoveryLib, /onConflict: 'org_id,idempotency_key'/);
  assert.match(discoveryLib, /const idempotencyKey = `\$\{campaignId\}:\$\{provider\.key\}:\$\{JSON\.stringify\(searchInput\)\}`/);
  assert.match(discoveryLib, /export async function runDiscoveryJob/);
  // runDiscoveryJob itself must not perform a direct leads insert — conversion is a separate, explicit action.
  const jobFnStart = discoveryLib.indexOf('export async function runDiscoveryJob');
  const jobFnEnd = discoveryLib.indexOf('export type ReviewAction');
  const jobFnBody = discoveryLib.slice(jobFnStart, jobFnEnd);
  assert.doesNotMatch(jobFnBody, /from\('leads'\)\.insert/);
});

test('S48-GROWTH-014: duplicate detection checks both CRM leads and prior external discoveries and returns a confidence score', () => {
  assert.match(discoveryLib, /export async function detectDuplicate/);
  assert.match(discoveryLib, /from\('leads'\)/);
  assert.match(discoveryLib, /from\('external_opportunities'\)/);
  assert.match(discoveryLib, /confidence: number/);
  assert.match(discoveryLib, /confirmed_duplicate/);
  assert.match(discoveryLib, /possible_duplicate/);
});

test('S48-GROWTH-013/014: fit scoring is explainable and penalizes unresolved duplicates', () => {
  assert.match(discoveryLib, /export function scoreExternalOpportunity/);
  assert.match(discoveryLib, /reasons: string\[\]/);
  assert.match(discoveryLib, /penalties: string\[\]/);
  assert.match(discoveryLib, /missingData: string\[\]/);
  assert.match(discoveryLib, /duplicate\.state === 'confirmed_duplicate'/);
  assert.match(discoveryLib, /score -= 40/);
});

test('S48-GROWTH-012/015: every review transition writes immutable history and an audit log entry, and approval-gated actions are marked', () => {
  assert.match(discoveryLib, /export async function transitionOpportunityReview/);
  assert.match(discoveryLib, /from\('external_opportunity_history'\)\.insert/);
  assert.match(discoveryLib, /if \(historyError\) throw historyError;/); // history-write failures are never swallowed
  assert.match(discoveryLib, /human_approval_required: action === 'approve' \|\| action === 'prepare_outreach'/);
  assert.match(discoveryLib, /writeAuditLog\(client, orgId, 'external_opportunity', opportunityId, `external_opportunity_\$\{action\}`/);
});

test('S48-GROWTH-015/016: outreach drafts are always saved with status "draft" and never trigger a send', () => {
  assert.match(discoveryLib, /export async function saveOutreachDraft/);
  assert.match(discoveryLib, /status: 'draft'/);
  assert.match(discoveryLib, /draft_source: 'ai'/);
  assert.doesNotMatch(discoveryLib, /status: 'sent'/);
  assert.doesNotMatch(discoveryLib, /nodemailer|twilio|sendgrid|whatsapp.*api\.com/i);
  assert.match(crmMatchesOutreachRoute, /status: 'draft'/);
  assert.doesNotMatch(crmMatchesOutreachRoute, /status: 'sent'/);
});

test('S48-GROWTH-020: conversion is delegated to the SECURITY DEFINER RPC, not a direct client insert into leads', () => {
  assert.match(discoveryLib, /export async function convertOpportunityToLead/);
  assert.match(discoveryLib, /client\.rpc\('app_convert_external_opportunity_to_lead'/);
  assert.doesNotMatch(discoveryLib, /convertOpportunityToLead[\s\S]{0,400}from\('leads'\)\.insert/);
});

test('S48-GROWTH-006/009: CRM Matches no longer selects nonexistent leads columns and stays organization scoped', () => {
  // Regression guard for the production bug: public.leads has no `status` or `buyer_type` column.
  assert.doesNotMatch(opportunityFinder, /,status,|,status'|'status,/);
  assert.doesNotMatch(opportunityFinder, /lead\.buyer_type|,buyer_type,|,buyer_type'/);
  assert.match(opportunityFinder, /\.eq\('organization_id', orgId\)/);
  assert.match(opportunityFinder, /owner_user_id/);
});

test('S48-GROWTH-006: CRM Matches never performs external/provider research (stays grounded in existing leads)', () => {
  assert.doesNotMatch(opportunityFinder, /discovery-providers|external_opportunities|fetch\(/i);
});

test('S48-GROWTH-007/008: CRM Matches workspace shows the full result count with pagination and buyer/supplier + owner + source filters', () => {
  assert.match(crmMatchesWorkspace, /PAGE_SIZE/);
  assert.match(crmMatchesWorkspace, /totalPages/);
  assert.doesNotMatch(crmMatchesWorkspace, /\.slice\(0,\s*5\)/);
  assert.match(crmMatchesWorkspace, /My records only/);
  assert.match(crmMatchesWorkspace, /All sources|setSource/);
});

test('S48-GROWTH-010/017: CRM match review actions stay inside Growth Center via a drawer; sending requires an explicit Approve & send click, never automatic', () => {
  assert.match(crmMatchesWorkspace, /GrowthReviewDrawer/);
  assert.match(crmMatchesWorkspace, /api\/setu-guru\/crm-matches\/outreach/);
  assert.match(crmMatchesWorkspace, /Approve & send/);
  assert.match(crmMatchesWorkspace, /onClick={approveAndSend}/);
  assert.doesNotMatch(crmMatchesWorkspace, /useEffect\([^)]*approveAndSend/);
});

test('S48-GROWTH-015: External Discovery workspace supports search, campaign/provider/country/type/fit/verification/duplicate/status filters and sorting', () => {
  for (const control of ['setSearch', 'setCampaignFilter', 'setSourceFilter', 'setCountryFilter', 'setTypeFilter', 'setVerificationFilter', 'setDuplicateFilter', 'setStatusFilter', 'setSortBy']) {
    assert.match(externalDiscoveryWorkspace, new RegExp(control));
  }
  assert.match(externalDiscoveryWorkspace, /Conversion rate/);
  assert.match(externalDiscoveryWorkspace, /Verification rate/);
});

test('S48-GROWTH-015: External Discovery review drawer requires an explicit action for every state change and never auto-fires on open', () => {
  assert.match(externalDiscoveryWorkspace, /Review actions \(human approval required\)/);
  assert.match(externalDiscoveryWorkspace, /onClick={\(\) => runReviewAction\('approve'\)}/);
  assert.match(externalDiscoveryWorkspace, /onClick={convert}/);
  assert.doesNotMatch(externalDiscoveryWorkspace, /useEffect\([^)]*runReviewAction/);
  assert.doesNotMatch(externalDiscoveryWorkspace, /useEffect\([^)]*convert\(\)/);
});

test('S48-GROWTH-011/013: campaign and job API routes stay organization scoped through requireWorkspace and reject client-supplied org ids', () => {
  for (const route of [campaignsRoute, jobsRoute, reviewRoute, convertRoute, outreachRoute]) {
    assert.match(route, /requireWorkspace\(\)/);
    assert.match(route, /workspace\.organization\?\.id/);
    assert.doesNotMatch(route, /organizationId:\s*request/i);
  }
});

test('S48-GROWTH-013: jobs route runs the provider registry inline rather than leaving jobs permanently queued', () => {
  assert.match(jobsRoute, /runDiscoveryJob/);
  assert.match(jobsRoute, /listDiscoveryProviders/);
});

test('Growth Work Queue, Pricing Intelligence, and existing sub-navigation are preserved (no-regression contract)', () => {
  assert.match(growthCenter, /Growth Work Queue/);
  assert.match(growthCenter, /Pricing Intelligence/);
  assert.match(growthCenter, /ProductPricingIntelligencePanel/);
  assert.match(growthCenter, /CrmMatchesWorkspace/);
  assert.match(growthCenter, /ExternalDiscoveryWorkspace/);
  assert.match(growthCenter, /TradeEventWorkspace/);
  assert.match(growthCenter, /Nothing is sent or changed without your approval/);
});

test('Growth Agent page passes the authenticated organization id and current user id, never a client-supplied one', () => {
  assert.match(growthAgentPage, /requireWorkspace\(\)/);
  assert.match(growthAgentPage, /workspace\.organization\?\.id/);
  assert.match(growthAgentPage, /currentUserId=\{workspace\.profile\?\.id/);
});

// --- S48-GROWTH-016 through 024 -------------------------------------------------------------

const completionMigration2 = readFileSync('supabase/migrations/20260716140000_s48_growth_016_024_lifecycle_and_followups.sql', 'utf8');
const governedDelivery = readFileSync('src/lib/setu-guru/governed-delivery.ts', 'utf8');
const growthFollowups = readFileSync('src/lib/setu-guru/growth-followups.ts', 'utf8');
const crmMatchesActions = readFileSync('src/lib/setu-guru/crm-matches-actions.ts', 'utf8');
const outreachSendRoute = readFileSync('src/app/api/setu-guru/external-discovery/outreach/send/route.ts', 'utf8');
const followUpRoute = readFileSync('src/app/api/setu-guru/external-discovery/follow-up/route.ts', 'utf8');
const crmSendRoute = readFileSync('src/app/api/setu-guru/crm-matches/outreach/send/route.ts', 'utf8');
const crmFollowUpRoute = readFileSync('src/app/api/setu-guru/crm-matches/follow-up/route.ts', 'utf8');
const historyRoute = readFileSync('src/app/api/setu-guru/external-discovery/history/route.ts', 'utf8');
const growthCenterRedesign2 = readFileSync('src/features/setu-guru/growth-center-redesign.tsx', 'utf8');

test('S48-GROWTH-012/020: migration part 2 is additive and extends the review lifecycle with contacted/responded/qualified/nurture', () => {
  assert.doesNotMatch(completionMigration2, /drop table/i);
  assert.doesNotMatch(completionMigration2, /delete from/i);
  assert.match(completionMigration2, /'contacted'::?text|'contacted'/);
  assert.match(completionMigration2, /'responded'/);
  assert.match(completionMigration2, /'qualified'/);
  assert.match(completionMigration2, /'nurture'/);
  assert.match(completionMigration2, /add column if not exists next_follow_up_at/);
  assert.match(completionMigration2, /add column if not exists follow_up_recommendation_id uuid references public\.ai_recommendations/);
});

test('S48-GROWTH-018/022: ai_recommendations is widened to accept external_opportunity follow-ups without a parallel task system', () => {
  assert.match(completionMigration2, /ai_recommendations_entity_type_check/);
  assert.match(completionMigration2, /'external_opportunity'/);
  assert.match(completionMigration2, /ai_recommendations_type_check/);
  assert.match(completionMigration2, /'growth_outreach_follow_up'/);
});

test('S48-GROWTH-017: governed delivery never claims a send succeeded without a connected integration', () => {
  assert.match(governedDelivery, /export async function checkGovernedDelivery/);
  assert.match(governedDelivery, /from\('integrations'\)/);
  assert.match(governedDelivery, /is_active/);
  assert.match(governedDelivery, /is not connected for this organization yet/);
  assert.match(governedDelivery, /if \(!integration\?\.id\) \{/);
  assert.match(governedDelivery, /return \{ queued: true, provider, reason: null, target: cleanTarget \};/);
});

test('S48-GROWTH-017: outreach send routes update an existing draft, never insert a new pre-sent message', () => {
  for (const lib of [discoveryLib, crmMatchesActions]) {
    assert.match(lib, /checkGovernedDelivery/);
    assert.match(lib, /status === 'sent'\)/);
    assert.match(lib, /from\('communications'\)\s*\n?\s*\.update/);
  }
});

test('S48-GROWTH-017: a send only marks an external opportunity contacted when delivery was actually queued', () => {
  assert.match(discoveryLib, /if \(delivery\.queued\) \{\s*\n\s*await transitionOpportunityReview\(orgId, opportunityId, 'mark_contacted'/);
});

test('S48-GROWTH-018: follow-ups are scheduled and cancelled through explicit user action, never automatically', () => {
  assert.match(growthFollowups, /export async function scheduleGrowthFollowUp/);
  assert.match(growthFollowups, /export async function cancelGrowthFollowUp/);
  assert.match(growthFollowups, /recommendation_type: 'growth_outreach_follow_up'/);
  assert.match(followUpRoute, /requireWorkspace\(\)/);
  assert.match(crmFollowUpRoute, /requireWorkspace\(\)/);
});

test('S48-GROWTH-019: request-deeper-research and activity history do not change review status', () => {
  assert.match(discoveryLib, /export async function requestDeeperResearch/);
  assert.match(discoveryLib, /export async function getOpportunityHistory/);
  const fnStart = discoveryLib.indexOf('export async function requestDeeperResearch');
  const fnEnd = discoveryLib.indexOf('export async function listExternalDiscovery');
  const fnBody = discoveryLib.slice(fnStart, fnEnd);
  assert.doesNotMatch(fnBody, /review_status/);
  assert.match(historyRoute, /requireWorkspace\(\)/);
});

test('S48-GROWTH-020: the full lifecycle action set is organization scoped and every transition is still audited', () => {
  assert.match(discoveryLib, /mark_contacted: 'contacted'/);
  assert.match(discoveryLib, /record_response: 'responded'/);
  assert.match(discoveryLib, /qualify: 'qualified'/);
  assert.match(discoveryLib, /move_to_nurture: 'nurture'/);
  assert.match(reviewRoute, /mark_contacted.*record_response.*qualify.*move_to_nurture/s);
});

test('S48-GROWTH-021: every Growth Center audit event is marked human-approved because no autonomous trigger exists in this codebase', () => {
  assert.match(discoveryLib, /approved_by_human: true/);
  assert.doesNotMatch(discoveryLib, /cron|scheduled job|background worker/i);
});

test('S48-GROWTH-022: Work Queue shows New CRM matches and External prospects as separate counts and never redefines New opportunities', () => {
  assert.match(growthCenterRedesign2, /New CRM matches/);
  assert.match(growthCenterRedesign2, /External prospects/);
  assert.match(growthCenterRedesign2, /never combined/);
  assert.match(growthCenterRedesign2, /'New opportunities', value: opportunities\.length/);
});

test('S48-GROWTH-023: the review drawer stays keyboard and screen-reader accessible (focus trap, Escape, aria-live status)', () => {
  const drawer = readFileSync('src/features/setu-guru/growth-review-drawer.tsx', 'utf8');
  assert.match(drawer, /role="dialog"/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /event\.key === 'Escape'/);
  assert.match(externalDiscoveryWorkspace, /aria-live="polite"/);
  assert.match(crmMatchesWorkspace, /aria-live="polite"/);
});

test('S48-GROWTH-024: release-blocking guardrails hold across the full completion — no auto lead creation, no auto send, tenancy enforced everywhere touched', () => {
  const allRoutes = [campaignsRoute, jobsRoute, reviewRoute, convertRoute, outreachRoute, outreachSendRoute, followUpRoute, crmSendRoute, crmFollowUpRoute, historyRoute, crmMatchesOutreachRoute];
  for (const route of allRoutes) {
    assert.match(route, /requireWorkspace\(\)/);
  }
  assert.doesNotMatch(discoveryLib, /cron\.schedule|setInterval/);
  assert.match(discoveryLib, /export async function convertOpportunityToLead/);
});
