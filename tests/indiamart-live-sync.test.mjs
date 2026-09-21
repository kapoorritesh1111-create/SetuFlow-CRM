import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const adapter = fs.readFileSync('src/features/integrations/indiamart/server.ts', 'utf8');
const admin = fs.readFileSync('src/app/(app)/admin/integrations/indiamart/page.tsx', 'utf8');
const adminHub = fs.readFileSync('src/app/(app)/admin/integrations/page.tsx', 'utf8');
const cron = fs.readFileSync('src/app/api/cron/indiamart-sync/route.ts', 'utf8');
const controls = fs.readFileSync('src/features/integrations/interakt/components/inbound-view-controls.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/integrations/interakt/inbound-workspace.ts', 'utf8');
const inboundActions = fs.readFileSync('src/features/integrations/interakt/inbound-actions.ts', 'utf8');
const sharedActions = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const callActions = fs.readFileSync('src/features/integrations/interakt/review-actions.ts', 'utf8');
const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const credentialMigration = fs.readFileSync('supabase/migrations/20260917143000_indiamart_service_credential_read.sql', 'utf8');
const providerMigration = fs.readFileSync('supabase/migrations/20260917192000_stark_inbound_provider_channel_filters.sql', 'utf8');
const compatibilityMigration = fs.readFileSync('supabase/migrations/20260917193000_stark_inbound_provider_compat.sql', 'utf8');
const assignmentMigration = fs.readFileSync('supabase/migrations/20260917194000_stark_indiamart_sales_assignment.sql', 'utf8');

test('IndiaMART adapter uses server-side Vault credential and official pull-v2 endpoint', () => {
  assert.match(adapter, /mapi\.indiamart\.com\/wservce\/crm\/crmListing\/v2/);
  assert.match(adapter, /get_integration_credential_service/);
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_.*INDIAMART/);
  assert.match(credentialMigration, /grant execute .* service_role/i);
  assert.match(credentialMigration, /revoke all .* authenticated/i);
});

test('IndiaMART sync stages and deduplicates by provider enquiry id', () => {
  assert.match(adapter, /UNIQUE_QUERY_ID/);
  assert.match(adapter, /lead_intake_staging/);
  assert.match(adapter, /organization_id,source_provider,external_contact_id/);
  assert.match(adapter, /source_provider:\s*PROVIDER/);
});

test('manual activation only happens after a successful real pull', () => {
  assert.match(admin, /Sync now & enable/);
  assert.match(admin, /activateAfterSuccess:\s*true/);
  assert.match(adapter, /is_active:\s*options\.activateAfterSuccess \? true/);
  assert.match(adapter, /sync_enabled:\s*options\.activateAfterSuccess \? true/);
});

test('successful admin actions redirect outside the provider-call catch block', () => {
  const testAction = admin.slice(admin.indexOf('async function testConnection'), admin.indexOf('async function syncNow'));
  const syncAction = admin.slice(admin.indexOf('async function syncNow'), admin.indexOf('async function pauseSync'));
  assert.match(testAction, /try\s*\{[\s\S]*testIndiaMartConnection[\s\S]*\}\s*catch[\s\S]*redirect\(`\/admin\/integrations\/indiamart\?notice=test-ok/);
  assert.match(syncAction, /try\s*\{[\s\S]*syncIndiaMartOrganization[\s\S]*\}\s*catch[\s\S]*redirect\(`\/admin\/integrations\/indiamart\?notice=sync-ok/);
});

test('connection and sync do not report success unless integration metadata is persisted', () => {
  assert.match(adapter, /Unable to persist IndiaMART connection status/);
  assert.match(adapter, /Unable to persist IndiaMART sync checkpoint/);
  assert.match(adapter, /integrationUpdateError/);
});

test('Stark inbound workspace can switch between all, Interakt and IndiaMART without overwriting channel filters', () => {
  assert.match(controls, /All inbound/);
  assert.match(controls, />Interakt</);
  assert.match(controls, />IndiaMART</);
  assert.match(controls, /updateParam\('provider', 'interakt'\)/);
  assert.match(controls, /updateParam\('provider', 'indiamart'\)/);
  assert.match(workspace, /p_provider: provider/);
  assert.match(inboundPage, /provider: searchParams\.provider/);
  assert.match(inboundPage, /name="provider" value=\{searchParams\.provider\}/);
  assert.match(providerMigration, /p_provider text default 'all'/);
  assert.match(providerMigration, /s\.source_provider = p_provider/);
  assert.match(compatibilityMigration, /p_source, 'all'\) not in \('interakt','indiamart'\)/);
});

test('IndiaMART rows are assigned to the Stark sales pool before sales scoping', () => {
  assert.match(assignmentMigration, /v_provider not in \('interakt', 'indiamart'\)/);
  assert.match(assignmentMigration, /v_provider = 'interakt'/);
  assert.match(assignmentMigration, /Fallback for unassigned Interakt and all new IndiaMART enquiries/);
  assert.match(assignmentMigration, /before insert or update of interakt_assignee_name, source_provider/);
  assert.match(assignmentMigration, /s\.source_provider = 'indiamart'/);
});

test('IndiaMART product and enquiry text participate in Setu Guru assessment', () => {
  for (const source of [workspace, inboundActions]) {
    assert.match(source, /traits\.query_product_name/);
    assert.match(source, /traits\.query_message/);
    assert.match(source, /packagingType: row\.packaging_type \|\| indiaMartProduct/);
    assert.match(source, /inboundMessageTexts: indiaMartMessage \? \[indiaMartMessage\]/);
  }
});

test('inbound records are visibly and persistently attributed to their provider', () => {
  assert.match(workspace, /providerLabel\(row\.source_provider\)/);
  assert.match(workspace, /computed_source: `\$\{providerName\}/);
  assert.match(inboundActions, /source_type: provider/);
  assert.match(inboundActions, /inbound_provider: provider/);
  assert.match(inboundActions, /IndiaMART enquiry/);
  assert.match(inboundPage, /function ProviderBadge/);
  assert.match(inboundPage, /IndiaMART enquiry/);
  assert.match(inboundPage, /href="#message-customer"/);
});

test('shared Stark inbound review actions accept both supported providers while WhatsApp send remains Interakt-only', () => {
  assert.match(sharedActions, /SUPPORTED_INBOUND_PROVIDERS = \['interakt', 'indiamart'\]/);
  assert.match(sharedActions, /updateStarkInteraktIntakeStatus[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /saveStarkInteraktQualification[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /acceptStarkInteraktCompanySuggestion[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /sendStarkInteraktTemplate[\s\S]*eq\('source_provider', SOURCE_PROVIDER\)/);
  assert.match(callActions, /source_provider', SUPPORTED_PROVIDERS/);
});

test('IndiaMART controls are reachable from the main Integrations page', () => {
  assert.match(adminHub, /href="\/admin\/integrations\/indiamart"/);
  assert.match(adminHub, /Manage IndiaMART/);
  assert.match(adminHub, /href="\/leads\/inbound\?provider=indiamart"/);
});

test('scheduled sync is protected, observable and stays outside the provider cooldown', () => {
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /authorization/);
  const job = vercel.crons.find((item) => item.path === '/api/cron/indiamart-sync');
  assert.ok(job);
  assert.equal(job.schedule, '*/10 * * * *');
  assert.match(cron, /PROVIDER_COOLDOWN_MS = 6 \* 60 \* 1000/);
  assert.match(cron, /last_successful_sync_at/);
  assert.match(cron, /reason: 'provider_cooldown'/);
  assert.match(cron, /cron_last_attempt_at/);
  assert.match(cron, /cron_last_success_at/);
  assert.match(cron, /cron_last_failure_at/);
  assert.match(cron, /failures\.length/);
});

test('audit events never include the CRM key', () => {
  assert.match(adapter, /integration_events/);
  assert.doesNotMatch(adapter, /payload:\s*\{[^}]*crmKey/s);
  assert.doesNotMatch(adapter, /payload:\s*\{[^}]*glusr_crm_key/s);
});
