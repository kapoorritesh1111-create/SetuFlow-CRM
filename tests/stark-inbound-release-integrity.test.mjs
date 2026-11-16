import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const get = (p) => fs.readFileSync(p, 'utf8');
const sync = get('src/features/integrations/interakt/server.ts');
const webhook = get('src/features/integrations/interakt/webhook.ts');
const sales = get('src/features/integrations/interakt/sales-message-actions.ts');
const ui = get('src/app/(app)/leads/inbound/page.tsx');
const sql = get('supabase/migrations/20261116100000_stark_inbound_release_integrity.sql');

test('contact snapshot fetches all pages and provider changes are split when capped', () => {
  assert.match(sync, /for \(let offset = 0; ; offset \+= pageSize\)/);
  assert.match(sync, /order\('external_contact_id'/);
  assert.match(sync, /\.range\(offset, offset \+ pageSize - 1\)/);
  assert.match(sync, /if \(overflow\)/);
  assert.match(sync, /collectWindow\(from, new Date\(midpoint\)/);
  assert.match(sync, /collectWindow\(new Date\(midpoint\), to/);
});
test('webhooks reject silent write errors and preserve provider time', () => {
  assert.match(webhook, /async function requiredWrite/);
  assert.match(webhook, /requiredWrite\(db\.from\('lead_intake_messages'\)\.upsert/);
  assert.match(webhook, /requiredWrite\(db\.from\('lead_intake_staging'\)\.update/);
  assert.match(webhook, /requiredWrite\(db\.from\('lead_intake_webhook_events'\)\.update/);
  assert.match(webhook, /iso\(data\.modified_at_utc\) \?\? intake\.source_modified_at/);
});
test('all four messaging actions reserve a send and check owner', () => {
  assert.equal((sales.match(/reserveInboundSend\(db, workspace, row\.id,/g) || []).length, 4);
  assert.equal((sales.match(/finishInboundSend\(db, workspace, reservation, 'sent'/g) || []).length, 4);
  assert.equal((sales.match(/assertCurrentOutboundOwner\(db, workspace, row\.id/g) || []).length, 4);
  assert.match(sql, /pg_advisory_xact_lock/);
  assert.match(sql, /p_owner_override/);
  assert.match(sql, /enable row level security/);
  assert.match(sql, /grant execute on function public\.reserve_stark_inbound_send/);
});
test('chronological reply handling excludes bot prompts and stale events', () => {
  assert.match(sql, /v_at >= coalesce\(s\.last_outbound_at/);
  assert.match(sql, /v_at >= coalesce\(s\.last_inbound_at/);
  assert.match(sql, /new\.actor_type='agent'/);
  assert.match(sql, /interakt_manual_outbound_gap/);
  assert.match(ui, /Awaiting sales action/);
  assert.match(ui, /Replied/);
});
test('member activation cannot bulk replace existing manual or qualified ownership', () => {
  assert.match(sql, /s\.setu_assigned_user_id is null/);
  assert.match(sql, /s\.qualified_lead_id is null/);
  assert.match(sql, /s\.setu_assignment_origin is distinct from 'manual'/);
  assert.match(sql, /inbound_lead_reassigned/);
  assert.doesNotMatch(sql, /update public\.leads l\s+set owner_user_id/);
});
