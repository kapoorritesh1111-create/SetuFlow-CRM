import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = readFileSync('supabase/migrations/20260710203000_s42_guru_002_ai_recommendations.sql', 'utf8');
const generator = readFileSync('src/lib/setu-guru/recommendation-generator.ts', 'utf8');
const triggerRoute = readFileSync('src/app/api/setu-guru/recommendations/generate/route.ts', 'utf8');
const query = readFileSync('src/lib/setu-guru/recommendations.ts', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');
const growthRoute = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const dashboardStrip = readFileSync('src/features/setu-guru/setu-guru-dashboard-strip.tsx', 'utf8');
const dashboardPage = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
const routeManifest = JSON.parse(readFileSync('src/lib/routes/manifest.json', 'utf8'));

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
  for (const surface of [growthCenter, dashboardStrip]) {
    assert.match(surface, /recommendation\.reason/);
    assert.match(surface, /recommendation\.priority/);
    assert.match(surface, /recommendation\.recommended_action/);
    assert.match(surface, /recommendation\.action_href/);
  }
  assert.match(growthCenter, /Nothing is sent or changed without your approval/);
});

test('Generated action links use only confirmed CRM routes', () => {
  assert.equal(routeManifest.routes.app.quotes, '/quotes');
  assert.equal(routeManifest.routes.app.leads, '/leads');
  assert.doesNotMatch(generator, /\/leads\/\$\{[^}]+\}\/rfq/);
  assert.doesNotMatch(generator, /\/leads\/\$\{[^}]+\}\/quote/);
  assert.doesNotMatch(generator, /\/quotes\/\$\{[^}]+\}/);
  assert.match(generator, /action_href: `\/leads\/\$\{rfq\.lead_id\}`/);
  assert.match(generator, /action_href: quote\.lead_id \? `\/leads\/\$\{quote\.lead_id\}` : '\/quotes'/);
});

test('Growth Agent foundation has no autonomous outbound communication', () => {
  const foundation = [generator, triggerRoute, query, growthCenter, dashboardStrip].join('\n');
  assert.doesNotMatch(foundation, /send_email|sendEmail|send_whatsapp|sendWhatsApp|provider_message_id/);
  assert.doesNotMatch(generator, /from\(['"]communications['"]\)\.insert/);
  assert.doesNotMatch(generator, /from\(['"]quotes['"]\)\.update/);
  assert.doesNotMatch(generator, /from\(['"]leads['"]\)\.update/);
  assert.doesNotMatch(generator, /from\(['"]orders['"]\)\.update/);
});

test('Growth Center avoids repeating priority cards and collapses long queues', () => {
  assert.match(growthCenter, /priorityItems = ordered\.slice\(0, 4\)/);
  assert.match(growthCenter, /priorityIds/);
  assert.match(growthCenter, /remainingItems/);
  assert.match(growthCenter, /visible = items\.slice\(0, 3\)/);
  assert.match(growthCenter, /<details/);
  assert.match(growthCenter, /Show \{remaining\.length\} more/);
  assert.match(growthCenter, /Priority cards are not repeated below/);
});

test('Dashboard strip is bounded, ordered, responsive, and resilient', () => {
  assert.match(dashboardStrip, /priorityRank/);
  assert.match(dashboardStrip, /Date\.parse\(b\.created_at\)/);
  assert.match(dashboardStrip, /\.slice\(0, 5\)/);
  assert.match(dashboardStrip, /SetuGuruDashboardStripLoading/);
  assert.match(dashboardStrip, /temporarily unavailable/);
  assert.match(dashboardStrip, /sm:/);
  assert.match(dashboardPage, /Suspense/);
});
