import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260710203000_s42_guru_002_ai_recommendations.sql', 'utf8');
const generator = readFileSync('src/lib/setu-guru/recommendation-generator.ts', 'utf8');
const triggerRoute = readFileSync('src/app/api/setu-guru/recommendations/generate/route.ts', 'utf8');
const query = readFileSync('src/lib/setu-guru/recommendations.ts', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
const growthCenterRedesign = readFileSync('src/features/setu-guru/growth-center-redesign.tsx', 'utf8');
const growthRoute = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const dashboardStrip = readFileSync('src/features/setu-guru/setu-guru-dashboard-strip.tsx', 'utf8');
const dashboardPopover = readFileSync('src/features/setu-guru/setu-guru-dashboard-popover.tsx', 'utf8');
const dashboardPage = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
const routeManifest = readFileSync('src/lib/routes/manifest.json', 'utf8');

const initialTypes = [
  'lead_no_outreach',
  'quote_no_follow_up',
  'trade_event_lead_not_contacted',
  'supplier_document_gap',
  'buyer_quote_request',
  'catalog_sent_no_reply',
  'supplier_rfq_overdue',
  'deal_stuck_in_stage',
];

test('Growth Agent migration is organization scoped and rollback ready', () => {
  assert.match(migration, /org_id uuid not null references public\.organizations/);
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /public\.is_org_member\(org_id\)/);
  assert.match(migration, /for select/);
  assert.match(migration, /for insert/);
  assert.match(migration, /for update/);
  assert.match(migration, /for delete/);
  assert.match(migration, /unique index[\s\S]*status = 'open'/i);
  assert.match(migration, /drop table public\.ai_recommendations cascade/i);
});

test('Every initial recommendation type is generated deterministically', () => {
  for (const type of initialTypes) assert.match(generator, new RegExp(type));
  assert.match(generator, /\.eq\('organization_id', orgId\)/);
  assert.match(generator, /\.eq\('org_id', orgId\)/);
  assert.match(generator, /skippedDuplicates/);
  assert.match(generator, /const status = isExpired \? 'expired' : 'completed'/);
  assert.match(generator, /completed_at/);
  assert.match(generator, /expired_at/);
});

test('Recommendation generation cannot accept a client supplied organization id', () => {
  assert.match(triggerRoute, /requireWorkspace\(\)/);
  assert.match(triggerRoute, /workspace\.organization\?\.id/);
  assert.doesNotMatch(triggerRoute, /request\.json\(\)/);
  assert.doesNotMatch(triggerRoute, /searchParams\.get\(['"]org/);
});

test('Growth Center and dashboard query only current-organization open recommendations', () => {
  assert.match(query, /\.eq\('org_id', orgId\)/);
  assert.match(query, /\.eq\('status', 'open'\)/);
  assert.match(growthRoute, /requireWorkspace\(\)/);
  assert.match(growthRoute, /getGrowthCenterRecommendations\(organizationId\)/);
  assert.match(dashboardPage, /workspace\.organization\.id/);
  assert.match(dashboardStrip, /getGrowthCenterRecommendations\(organizationId\)/);
});

test('Recommendation cards remain explainable and action linked', () => {
  const surfaces = [growthCenter, growthCenterRedesign, dashboardPopover].join('\n');
  assert.match(surfaces, /recommendation\.priority/);
  assert.match(surfaces, /recommendation\.recommended_action/);
  assert.match(surfaces, /recommendation\.action_href/);
  assert.match(surfaces, /recommendation\.reason/);
  assert.match(surfaces, /Nothing is sent or changed without your approval/);
});

test('Generated action links use only confirmed CRM routes', () => {
  assert.match(routeManifest, /"leads": "\/leads"/);
  assert.match(routeManifest, /"quotes": "\/quotes"/);
  assert.doesNotMatch(generator, /\/leads\/\$\{[^}]+\}\/rfq/);
  assert.doesNotMatch(generator, /\/leads\/\$\{[^}]+\}\/quote/);
  assert.doesNotMatch(generator, /action_href: `\/quotes\/\$\{quote\.id\}`/);
  assert.match(generator, /action_href: quote\.lead_id \? `\/leads\/\$\{quote\.lead_id\}` : '\/quotes'/);
  assert.match(generator, /action_href: `\/leads\/\$\{rfq\.lead_id\}`/);
});

test('Quote follow-up recommendations identify the buyer and quote', () => {
  assert.match(generator, /select\('id,lead_id,quote_number,status,sent_at/);
  assert.match(generator, /const buyer = leads\.find/);
  assert.match(generator, /const buyerLabel = buyer\?\.company_name \|\| buyer\?\.contact_name \|\| 'buyer'/);
  assert.match(generator, /const quoteLabel = quote\.quote_number \|\| 'sent quote'/);
  assert.match(generator, /title: `Follow up on \$\{quoteLabel\} for \$\{buyerLabel\}`/);
  assert.match(generator, /metadata: \{ lead_id: quote\.lead_id, quote_id: quote\.id, quote_number: quote\.quote_number, buyer_name: buyerLabel \}/);
});

test('Growth Agent foundation has no autonomous outbound communication', () => {
  const foundation = [generator, triggerRoute, query, growthCenter, growthCenterRedesign, dashboardStrip, dashboardPopover].join('\n');
  assert.doesNotMatch(foundation, /send_email|sendEmail|send_whatsapp|sendWhatsApp|provider_message_id/);
  assert.doesNotMatch(generator, /from\(['"]communications['"]\)\.insert/);
  assert.doesNotMatch(generator, /from\(['"]quotes['"]\)\.update/);
  assert.doesNotMatch(generator, /from\(['"]leads['"]\)\.update/);
  assert.doesNotMatch(generator, /from\(['"]orders['"]\)\.update/);
});

test('Growth Center keeps the redesigned queue and approved workspace navigation', () => {
  assert.match(growthCenter, /GrowthCenterRedesign/);
  assert.match(growthCenter, /Growth Work Queue/);
  assert.match(growthCenter, /Pricing Intelligence/);
  assert.match(growthCenter, /CRM Matches/);
  assert.match(growthCenter, /External Discovery/);
  assert.match(growthCenter, /Trade Events/);
  assert.match(growthCenterRedesign, /Today/);
  assert.match(growthCenterRedesign, /Revenue/);
  assert.match(growthCenterRedesign, /Suppliers/);
  assert.match(growthCenterRedesign, /Opportunities/);
  assert.match(growthCenterRedesign, /Completed/);
  assert.match(growthCenterRedesign, /ActionPanel/);
  assert.match(growthCenterRedesign, /Setu Guru activity/);
});

test('Dashboard uses one small strip and an on-demand top-three overlay', () => {
  assert.match(dashboardStrip, /selectDiverseTopRecommendations/);
  assert.match(dashboardStrip, /usedTypes/);
  assert.match(dashboardStrip, /selected\.length === 3/);
  assert.match(dashboardStrip, /SetuGuruDashboardPopover/);
  assert.doesNotMatch(dashboardStrip, /grid-cols-3/);
  assert.match(dashboardPopover, /View top 3/);
  assert.match(dashboardPopover, /role="dialog"/);
  assert.match(dashboardPopover, /View all \{totalOpen\}/);
  assert.match(dashboardPopover, /Three different actions selected/);
  assert.match(dashboardPopover, /max-h-\[86vh\]/);
  assert.match(dashboardStrip, /SetuGuruDashboardStripLoading/);
  assert.match(dashboardPage, /Suspense/);
});
