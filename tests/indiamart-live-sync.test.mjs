import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const adapter = fs.readFileSync('src/features/integrations/indiamart/server.ts', 'utf8');
const admin = fs.readFileSync('src/app/(app)/admin/integrations/indiamart/page.tsx', 'utf8');
const cron = fs.readFileSync('src/app/api/cron/indiamart-sync/route.ts', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/20260917143000_indiamart_service_credential_read.sql', 'utf8');

test('IndiaMART adapter uses server-side Vault credential and official pull-v2 endpoint', () => {
  assert.match(adapter, /mapi\.indiamart\.com\/wservce\/crm\/crmListing\/v2/);
  assert.match(adapter, /get_integration_credential_service/);
  assert.doesNotMatch(adapter, /NEXT_PUBLIC_.*INDIAMART/);
  assert.match(migration, /grant execute .* service_role/i);
  assert.match(migration, /revoke all .* authenticated/i);
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
