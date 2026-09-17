import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const page = fs.readFileSync('src/app/(app)/admin/integrations/page.tsx', 'utf8');

test('integrations dashboard remains under admin and groups business integrations', () => {
  assert.match(page, /AdminSettingsShell active="integrations"/);
  assert.match(page, /Lead Sources/);
  assert.match(page, /Communication & Delivery/);
  assert.match(page, /Website & API Access/);
  assert.match(page, /Advanced setup/);
});

test('lead metrics are queried from live lead_intake_staging data', () => {
  assert.match(page, /from\('lead_intake_staging'\)/);
  assert.match(page, /source_provider', 'interakt'/);
  assert.match(page, /source_provider', 'indiamart'/);
  assert.match(page, /interaktToday\.count/);
  assert.match(page, /indiaMart30d\.count/);
  assert.doesNotMatch(page, />45</);
  assert.doesNotMatch(page, />331</);
  assert.doesNotMatch(page, />1,248</);
});

test('mail and provider health use live organization-scoped records', () => {
  assert.match(page, /from\('mail_mailboxes'\)/);
  assert.match(page, /from\('mail_domains'\)/);
  assert.match(page, /from\('org_module_grants'\)/);
  assert.match(page, /from\('integration_events'\)/);
  assert.match(page, /eq\('organization_id', organization\.id\)/);
});

test('technical controls stay behind manage and advanced areas', () => {
  assert.match(page, /href="\/admin\/integrations\/indiamart"/);
  assert.match(page, /<details className="rounded-2xl border border-slate-200 bg-white p-4"><summary[^>]*>IndiaMART credential<\/summary>/);
  assert.match(page, /Create API key/);
});
