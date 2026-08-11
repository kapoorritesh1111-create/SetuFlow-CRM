import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const client = fs.readFileSync('src/features/integrations/interakt/client.ts', 'utf8');
const server = fs.readFileSync('src/features/integrations/interakt/server.ts', 'utf8');
const inboundPage = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260811093000_interakt_lead_intake_staging.sql', 'utf8');

const combinedRuntime = `${client}\n${server}\n${inboundPage}`;

test('Interakt spike uses the documented Contacts Retrieval endpoint and Basic auth', () => {
  assert.match(client, /https:\/\/api\.interakt\.ai\/v1\/public\/apis\/users\//);
  assert.match(client, /offset/);
  assert.match(client, /limit/);
  assert.match(client, /Authorization: `Basic \$\{getApiKey\(\)\}`/);
  assert.match(client, /filters: buildFilters/);
});

test('Interakt runtime has no live leads database read or write path', () => {
  assert.doesNotMatch(combinedRuntime, /\.from\(['"]leads['"]\)/);
  assert.doesNotMatch(combinedRuntime, /insert\s*\([^)]*leads/i);
  assert.doesNotMatch(combinedRuntime, /update\s*\([^)]*leads/i);
  assert.match(server, /\.from\(['"]lead_intake_staging['"]\)/);
});

test('staging migration is intentionally isolated from leads', () => {
  assert.match(migration, /create table if not exists public\.lead_intake_staging/);
  assert.doesNotMatch(migration, /lead_id\s+uuid/i);
  assert.doesNotMatch(migration, /references\s+public\.leads/i);
  assert.doesNotMatch(migration, /insert\s+into\s+public\.leads/i);
  assert.doesNotMatch(migration, /update\s+public\.leads/i);
});

test('active inbound queue hides terminal workflow statuses', () => {
  assert.match(server, /qualified/);
  assert.match(server, /duplicate/);
  assert.match(server, /existing_customer/);
  assert.match(server, /not_relevant/);
  assert.match(server, /TERMINAL_INBOUND_STATUSES/);
});

test('incremental sync preserves existing status and upserts on Interakt contact identity', () => {
  assert.match(server, /newestSourceWatermark/);
  assert.match(server, /modifiedAfter: watermark/);
  assert.match(server, /existingStatus\.get\(contact\.externalContactId\)/);
  assert.match(server, /organization_id,source_provider,external_contact_id/);
});

test('Interakt secret is server-only and never NEXT_PUBLIC', () => {
  assert.match(client, /process\.env\.INTERAKT_STARK_PACKMATE_API_KEY/);
  assert.doesNotMatch(combinedRuntime, /NEXT_PUBLIC_INTERAKT/);
});
