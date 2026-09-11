import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const migrationPath = 'supabase/migrations/20260911173500_mail_commercial_usage_reporting.sql';

test('commercial usage ledger meters only persisted Setu Mail provider activity', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /create table if not exists public\.mail_usage_events/);
  assert.match(migration, /resend_inbound_message/);
  assert.match(migration, /resend_outbound_message/);
  assert.match(migration, /cloudmersive_scan/);
  assert.match(migration, /mail_messages_capture_commercial_usage/);
  assert.match(migration, /mail_attachments_capture_scan_usage/);
  assert.match(migration, /platform transactional.*email.*excluded/is);
  assert.doesNotMatch(migration, /notification_emails|organization_invitations.*mail_usage_events/is);
});

test('usage backfill excludes drafts and failed outbound messages and reconciles the quota counter', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /m\.direction = 'outbound'.*m\.provider_message_id is not null.*m\.status not in \('draft','failed'\)/s);
  assert.match(migration, /m\.direction = 'inbound'.*m\.status = 'received'/s);
  assert.match(migration, /update public\.mail_entitlements e\s+set current_period_messages/s);
  assert.match(migration, /mail_usage_monthly_rollups/);
});

test('commercial usage ledger and provider cost tables are server-only', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  for (const table of ['mail_usage_events','mail_usage_monthly_rollups','mail_provider_cost_catalog','mail_provider_cost_settings']) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`revoke all on table public\\.${table} from anon, authenticated`));
  }
  assert.match(migration, /security definer\s+set search_path = public/);
  assert.match(migration, /revoke all on function public\.capture_mail_message_usage_event\(\) from public, anon, authenticated/);
  assert.match(migration, /security invoker\s+set search_path = public/);
  assert.match(migration, /grant execute on function public\.mail_smc_commercial_usage\(date\) to service_role/);
});

test('provider cost catalog carries verified official references without guessing the Resend account plan', () => {
  const migration = fs.readFileSync(migrationPath, 'utf8');
  assert.match(migration, /'resend','unconfigured','Resend — select account plan'/);
  assert.match(migration, /'resend','free','Resend Free',0,3000/);
  assert.match(migration, /'resend','pro','Resend Pro',20,50000,1000,0\.90/);
  assert.match(migration, /'resend','scale','Resend Scale',90,100000,1000,0\.90/);
  assert.match(migration, /'cloudmersive','free','Cloudmersive Free',0,600/);
  assert.match(migration, /'cloudmersive','basic','Cloudmersive Basic',19\.99,10000/);
  assert.match(migration, /'cloudmersive','business','Cloudmersive Business',49\.99,25000/);
  assert.match(migration, /'2026-09-11'/);
  assert.match(migration, /provider invoices remain the accounting source of truth/i);
});

test('SMC Mail usage page shows entitlement, usage, provider economics and metering drift', () => {
  const page = fs.readFileSync('src/app/smc/mail-usage/page.tsx', 'utf8');
  assert.match(page, /Mail Usage &amp; Provider Cost/);
  assert.match(page, /mail_smc_commercial_usage/);
  assert.match(page, /Provider cost assumptions/);
  assert.match(page, /Provider economics/);
  assert.match(page, /Organization Mail economics/);
  assert.match(page, /Platform transactional email is excluded by design/);
  assert.match(page, /metered_inbound_messages/);
  assert.match(page, /metered_outbound_messages/);
  assert.match(page, /metered_cloudmersive_scans/);
  assert.match(page, /metered_guru_actions/);
  assert.match(page, /counter drift warning/);
  assert.match(page, /usage-weighted/);
});

test('SMC provider cost selector is internal-only and audited', () => {
  const api = fs.readFileSync('src/app/api/smc/mail-provider-cost-profile/route.ts', 'utf8');
  const ui = fs.readFileSync('src/app/smc/mail-usage/provider-cost-controls.tsx', 'utf8');
  assert.match(api, /INTERNAL_ORG_ID/);
  assert.match(api, /SETU Mission Control access required/);
  assert.match(api, /mail_provider_cost_catalog/);
  assert.match(api, /mail_provider_cost_settings/);
  assert.match(api, /smc_mail_provider_cost_profile_updated/);
  assert.match(ui, /mail-provider-cost-profile/);
  assert.match(ui, /Official pricing/);
  assert.match(ui, /Cost ready/);
  assert.match(ui, /Needs setup/);
});
