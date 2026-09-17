import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const adapter = fs.readFileSync('src/features/integrations/indiamart/server.ts', 'utf8');
const admin = fs.readFileSync('src/app/(app)/admin/integrations/indiamart/page.tsx', 'utf8');
const cron = fs.readFileSync('src/app/api/cron/indiamart-sync/route.ts', 'utf8');
const controls = fs.readFileSync('src/features/integrations/interakt/components/inbound-view-controls.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/integrations/interakt/inbound-workspace.ts', 'utf8');
const inboundActions = fs.readFileSync('src/features/integrations/interakt/inbound-actions.ts', 'utf8');
const sharedActions = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const callActions = fs.readFileSync('src/features/integrations/interakt/review-actions.ts', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const credentialMigration = fs.readFileSync('supabase/migrations/20260917143000_indiamart_service_credential_read.sql', 'utf8');
const providerMigration = fs.readFileSync('supabase/migrations/20260917190000_stark_inbound_multi_provider.sql', 'utf8');

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

test('Stark inbound workspace can switch between all, Interakt and IndiaMART', () => {
  assert.match(controls, /All inbound/);
  assert.match(controls, />Interakt</);
  assert.match(controls, />IndiaMART</);
  assert.match(controls, /updateParam\('source', 'interakt'\)/);
  assert.match(controls, /updateParam\('source', 'indiamart'\)/);
  assert.match(providerMigration, /source_provider in \('interakt', 'indiamart'\)/);
  assert.match(providerMigration, /s\.source_provider = p_source/);
});

test('inbound records are visibly and persistently attributed to their provider', () => {
  assert.match(workspace, /providerLabel\(row\.source_provider\)/);
  assert.match(workspace, /computed_source: `\$\{provider\}/);
  assert.match(inboundActions, /source_type: provider/);
  assert.match(inboundActions, /inbound_provider: provider/);
  assert.match(inboundActions, /IndiaMART enquiry/);
});

test('shared Stark inbound review actions accept both supported providers while WhatsApp send remains Interakt-only', () => {
  assert.match(sharedActions, /SUPPORTED_INBOUND_PROVIDERS = \['interakt', 'indiamart'\]/);
  assert.match(sharedActions, /updateStarkInteraktIntakeStatus[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /saveStarkInteraktQualification[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /acceptStarkInteraktCompanySuggestion[\s\S]*in\('source_provider', SUPPORTED_INBOUND_PROVIDERS\)/);
  assert.match(sharedActions, /sendStarkInteraktTemplate[\s\S]*eq\('source_provider', SOURCE_PROVIDER\)/);
  assert.match(callActions, /source_provider', SUPPORTED_PROVIDERS/);
});

test('scheduled sync is protected and runs every ten minutes', () => {
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /authorization/);
  const job = vercel.crons.find((item) => item.path === '/api/cron/indiamart-sync');
  assert.ok(job);
  assert.equal(job.schedule, '*/10 * * * *');
});

test('audit events never include the CRM key', () => {
  assert.match(adapter, /integration_events/);
  assert.doesNotMatch(adapter, /payload:\s*\{[^}]*crmKey/s);
  assert.doesNotMatch(adapter, /payload:\s*\{[^}]*glusr_crm_key/s);
});
