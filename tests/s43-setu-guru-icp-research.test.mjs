import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const icpMigration = readFileSync('supabase/migrations/20260710210000_s43_guru_002_org_icp_profiles.sql', 'utf8');
const scopedIcpMigration = readFileSync('supabase/migrations/20260715170000_s48_growth_001_versioned_icp_profiles.sql', 'utf8');
const icpLib = readFileSync('src/lib/setu-guru/icp.ts', 'utf8');
const icpRoute = readFileSync('src/app/api/setu-guru/icp/route.ts', 'utf8');
const icpWizard = readFileSync('src/features/setu-guru/icp-setup-wizard.tsx', 'utf8');
const icpPage = readFileSync('src/app/(app)/growth-agent/icp/page.tsx', 'utf8');
const entityResearch = readFileSync('src/lib/setu-guru/entity-research.ts', 'utf8');
const entityResearchRoute = readFileSync('src/app/api/setu-guru/entity-research/route.ts', 'utf8');
const researchDrawer = readFileSync('src/features/setu-guru/research-drawer.tsx', 'utf8');
const leadDetailPage = readFileSync('src/app/(app)/leads/[leadId]/page.tsx', 'utf8');

test('ICP profile storage remains organization scoped and RLS protected', () => {
  assert.match(icpMigration, /org_id uuid not null references public\.organizations/);
  assert.match(icpMigration, /enable row level security/i);
  assert.match(icpMigration, /public\.is_org_member\(org_id\)/);
  assert.match(scopedIcpMigration, /owner_type in \('organization', 'personal', 'campaign'\)/);
  assert.match(scopedIcpMigration, /org_icp_profiles_active_org_idx/);
  assert.match(scopedIcpMigration, /org_icp_profiles_active_personal_idx/);
  assert.match(scopedIcpMigration, /org_icp_profiles_active_campaign_idx/);
});

test('ICP helpers support organization, personal, and campaign scopes without cross-profile overwrite', () => {
  assert.match(icpLib, /IcpOwnerType = 'organization' \| 'personal' \| 'campaign'/);
  assert.match(icpLib, /listIcpProfiles/);
  assert.match(icpLib, /resolveOwner/);
  assert.match(icpLib, /version: current \? current\.version \+ 1 : 1/);
  assert.doesNotMatch(icpLib, /onConflict: 'org_id'/);
});

test('ICP API route never accepts a client-supplied organization id', () => {
  assert.match(icpRoute, /requireWorkspace\(\)/);
  assert.match(icpRoute, /workspace\.organization\?\.id/);
  assert.doesNotMatch(icpRoute, /organizationId\s*=\s*(body|parsed)\./);
});

test('ICP API exposes profile scope and selection while retaining the existing GET and POST contract', () => {
  assert.match(icpRoute, /OwnerTypeSchema/);
  assert.match(icpRoute, /profileId/);
  assert.match(icpRoute, /listIcpProfiles/);
  assert.match(icpRoute, /saveIcpProfile/);
});

test('ICP Setup Wizard covers products, markets, buyer types, supplier needs, MOQ, documents, and outreach preferences', () => {
  for (const step of ['products', 'markets', 'buyers', 'suppliers', 'moq', 'documents', 'outreach']) {
    assert.match(icpWizard, new RegExp(`key: '${step}'`));
  }
  assert.match(icpWizard, /fetch\('\/api\/setu-guru\/icp'/);
  assert.match(icpPage, /requireWorkspace\(\)/);
});

test('Entity research is grounded in stored CRM data and does not call any outbound send API', () => {
  assert.match(entityResearch, /\.eq\('organization_id', orgId\)/);
  assert.match(entityResearch, /scoreFitAgainstIcp/);
  assert.doesNotMatch(entityResearch, /send_email|sendEmail|send_whatsapp|sendWhatsApp/);
  assert.doesNotMatch(entityResearch, /from\(['"]leads['"]\)\.update/);
  assert.doesNotMatch(entityResearch, /from\(['"]quotes['"]\)\.update/);
});

test('Entity research API route is organization scoped and requires a leadId', () => {
  assert.match(entityResearchRoute, /requireWorkspace\(\)/);
  assert.match(entityResearchRoute, /workspace\.organization\?\.id/);
  assert.match(entityResearchRoute, /searchParams\.get\('leadId'\)/);
});

test('Supplier research checks compliance document gaps and RFQ readiness without approving anything', () => {
  assert.match(entityResearch, /generateSupplierResearch/);
  assert.match(entityResearch, /complianceStatus/);
  assert.match(entityResearch, /rfqReadiness/);
  assert.doesNotMatch(entityResearch, /status:\s*'approved'/);
});

test('Research Drawer surfaces fit score, reasons, and a single recommended next action without auto-acting', () => {
  assert.match(researchDrawer, /fitSummary/);
  assert.match(researchDrawer, /recommendedNextAction/);
  assert.match(researchDrawer, /Nothing here is sent or changed automatically/);
  assert.doesNotMatch(researchDrawer, /fetch\(.*method:\s*'POST'/s);
});

test('Research Drawer is wired into the lead detail page for both buyer and supplier records', () => {
  assert.match(leadDetailPage, /ResearchDrawerLauncher/);
  assert.match(leadDetailPage, /leadType=\{data\.lead\.lead_type\}/);
});

test('CRM Matches scores only existing CRM leads and is not described as external discovery', () => {
  const opportunityFinder = readFileSync('src/lib/setu-guru/opportunity-finder.ts', 'utf8');
  const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
  const growthPage = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
  assert.match(opportunityFinder, /\.eq\('organization_id', orgId\)/);
  assert.match(opportunityFinder, /scoreFitAgainstIcp/);
  assert.doesNotMatch(opportunityFinder, /fetch\(['"]https?:\/\//);
  assert.match(growthCenter, /CRM Matches/);
  assert.match(growthCenter, /External Discovery/);
  assert.match(growthPage, /listTopFitOpportunities\(organizationId(?:,\s*\d+)?\)/);
});
