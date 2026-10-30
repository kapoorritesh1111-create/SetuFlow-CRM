import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webhook = fs.readFileSync('src/features/integrations/interakt/webhook.ts', 'utf8');

test('initial Interakt owner is written only while all ownership fields remain empty', () => {
  assert.match(webhook, /if \(initialOwner\) \{[\s\S]*?\.update\(ownerPatch\)[\s\S]*?\.is\('setu_assigned_user_id', null\)[\s\S]*?\.is\('setu_assigned_invitation_id', null\)[\s\S]*?\.is\('setu_assigned_email', null\)/);
});

test('general webhook data refresh never includes ownerPatch', () => {
  assert.doesNotMatch(webhook, /updated_at: now,\s*\.\.\.ownerPatch/);
  assert.match(webhook, /updated_at: now,\s*\.\.\.identityPatch/);
});

test('blank Interakt provider ownership uses only explicit available Sales users', () => {
  assert.match(webhook, /assignee\s*\?\s*await initialSetuOwnerFromInterakt\(db, assignee\)\s*:\s*await availableInitialSalesOwner\(db, intake\.id\)/);
  assert.match(webhook, /eq\('status', 'available'\)/);
  assert.match(webhook, /member\.is_internal_support/);
  assert.match(webhook, /toLowerCase\(\) === 'sales'/);
});

test('provider-named ownership does not trigger fallback', () => {
  assert.match(webhook, /A provider-specified assignee is authoritative/);
});

const managerActions = fs.readFileSync('src/features/integrations/interakt/assignment-management.ts', 'utf8');
const indiamartMigration = fs.readFileSync('supabase/migrations/20260929131000_stark_interakt_owner_authority.sql', 'utf8');
const availabilityMigration = fs.readFileSync('supabase/migrations/20261030110000_stark_inbound_agent_availability.sql', 'utf8');

test('availability failures cannot break message ingestion or create unapproved ownership', () => {
  assert.match(webhook, /if \(stateError\) \{[\s\S]*?return null;/);
  assert.match(webhook, /if \(error\) \{[\s\S]*?sales eligibility lookup unavailable[\s\S]*?return null;/);
});

test('availability is explicit and owner-managed; users start off duty', () => {
  assert.match(availabilityMigration, /default 'off_duty'/);
  assert.match(managerActions, /export async function updateStarkInboundAvailability/);
  assert.match(managerActions, /requireStarkAssignmentManager\(\)/);
  assert.match(managerActions, /inbound_availability_changed/);
});

test('IndiaMART existing initial route remains independent of Interakt fallback', () => {
  assert.match(indiamartMigration, /if v_provider = 'indiamart' then/);
  assert.doesNotMatch(webhook, /source_provider:\s*'indiamart'/);
});
