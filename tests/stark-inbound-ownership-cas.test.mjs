import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const webhook = fs.readFileSync('src/features/integrations/interakt/webhook.ts','utf8');
const allocator = fs.readFileSync('supabase/migrations/20261030110000_stark_inbound_agent_availability.sql','utf8');

test('webhook never overwrites an existing assigned user, email or invitation', () => {
  for (const field of ['setu_assigned_user_id','setu_assigned_invitation_id','setu_assigned_email']) {
    assert.match(webhook, new RegExp("\\.is\\('"+field+"', null\\)"));
    assert.match(allocator, new RegExp(field));
  }
  assert.doesNotMatch(webhook,/updated_at: now,\s*\.\.\.ownerPatch/);
});

test('only unowned Interakt inquiries without named provider assignee use online allocation', () => {
  assert.match(webhook,/!hasAnyOwner && !assignee && incoming/);
  assert.match(webhook,/stark_assign_online_unowned_interakt/);
  assert.match(allocator,/s\.source_provider = 'interakt'/);
  assert.match(allocator,/nullif\(btrim\(s\.interakt_assignee_name\)/);
  assert.match(allocator,/s\.qualified_lead_id is null/);
});

test('online is the existing chat heartbeat window, not user membership alone', () => {
  assert.match(allocator,/join public\.chat_presence cp/);
  assert.match(allocator,/cp\.status='online'/);
  assert.match(allocator,/cp\.last_seen_at > now\(\)-interval '2 minutes'/);
  assert.match(allocator,/om\.is_active=true/);
  assert.match(allocator,/om\.is_internal_support/);
  assert.match(allocator,/lower\(r\.name\)='sales'/);
});

test('allocation is serialized, least-loaded and cannot rewrite manual/provider assignments', () => {
  assert.match(allocator,/pg_advisory_xact_lock/);
  assert.match(allocator,/for update/);
  assert.match(allocator,/order by \([\s\S]*count\(\*\)/);
  assert.match(allocator,/setu_assigned_user_id is null/);
  assert.match(allocator,/interakt_assignee_name/);
  assert.match(allocator,/grant execute on function public\.stark_assign_online_unowned_interakt\(uuid\) to service_role/);
});

test('IndiaMART routing not modified by online allocation', () => {
  assert.match(allocator,/s\.source_provider = 'interakt'/);
  assert.doesNotMatch(allocator,/source_provider = 'indiamart'/);
});
