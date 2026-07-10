import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const icpMigration = readFileSync('supabase/migrations/20260710210000_s43_guru_002_org_icp_profiles.sql', 'utf8');
const icpLib = readFileSync('src/lib/setu-guru/icp.ts', 'utf8');
const icpRoute = readFileSync('src/app/api/setu-guru/icp/route.ts', 'utf8');
const icpWizard = readFileSync('src/features/setu-guru/icp-setup-wizard.tsx', 'utf8');
const icpPage = readFileSync('src/app/(app)/growth-agent/icp/page.tsx', 'utf8');
const entityResearch = readFileSync('src/lib/setu-guru/entity-research.ts', 'utf8');
const entityResearchRoute = readFileSync('src/app/api/setu-guru/entity-research/route.ts', 'utf8');
const researchDrawer = readFileSync('src/features/setu-guru/research-drawer.tsx', 'utf8');
const leadDetailPage = readFileSync('src/app/(app)/leads/[leadId]/page.tsx', 'utf8');

test('ICP profile migration is organization scoped, RLS protected, and singleton per org', () => {
  assert.match(icpMigration, /org_id uuid not null references public\.organizations/);
  assert.match(icpMigration, /enable row level security/i);
  assert.match(icpMigration, /public\.is_org_member\(org_id\)/);
  assert.match(icpMigration, /for select/);
  assert.match(icpMigration, /for insert/);
  assert.match(icpMigration, /for update/);
  assert.match(icpMigration, /for delete/);
  assert.match(icpMigration, /create unique index org_icp_profiles_one_per_org_idx on public\.org_icp_profiles \(org_id\)/);
  assert.match(icpMigration, /drop table public\.org_icp_profiles cascade/i);
});

test('ICP profile read/write helpers are organization scoped', () => {
  assert.match(icpLib, /\.eq\('org_id', orgId\)/);
  assert.match(icpLib, /org_id: orgId/);
  assert.match(icpLib, /onConflict: 'org_id'/);
});

test('ICP API route never accepts a client-supplied organization id', () => {
  assert.match(icpRoute, /requireWorkspace\(\)/);
  assert.match(icpRoute, /workspace\.organization\?\.id/);
  assert.doesNotMatch(icpRoute, /organizationId\s*=\s*(body|parsed)\./);
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

test('Opportunity Finder scores only existing CRM leads against the ICP profile and is organization scoped', () => {
  const opportunityFinder = readFileSync('src/lib/setu-guru/opportunity-finder.ts', 'utf8');
  const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
  const growthPage = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
  assert.match(opportunityFinder, /\.eq\('organization_id', orgId\)/);
  assert.match(opportunityFinder, /scoreFitAgainstIcp/);
  assert.doesNotMatch(opportunityFinder, /fetch\(['"]https?:\/\//);
  assert.match(growthCenter, /Opportunity Finder/);
  assert.match(growthPage, /listTopFitOpportunities\(organizationId\)/);
});
