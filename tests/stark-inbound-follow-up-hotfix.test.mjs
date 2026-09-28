import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const page = fs.readFileSync('src/app/(app)/leads/inbound/page.tsx', 'utf8');
const actions = fs.readFileSync('src/features/integrations/interakt/review-actions.ts', 'utf8');
const cron = fs.readFileSync('src/app/api/calendar/reminders/process/route.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260928110549_stark_inbound_follow_up_hotfix.sql', 'utf8');

test('inbound follow-up hotfix exposes queue, filters, and self-owned scheduling', () => {
  assert.match(page, /Follow-ups/);
  assert.match(page, /Overdue follow-ups/);
  assert.match(page, /InboundFollowUpCard/);
  assert.match(actions, /createOrRescheduleInboundFollowUp/);
  assert.match(actions, /completeInboundFollowUp/);
  assert.match(actions, /assigned_user_id: user\.id/);
});

test('inbound follow-ups send 15-minute notifications through existing reminder cron', () => {
  assert.match(cron, /15 \* 60 \* 1000/);
  assert.match(cron, /type: 'task_due'/);
  assert.match(cron, /inbound-follow-up:/);
  assert.match(migration, /inbound_follow_ups/);
  assert.match(migration, /followUps/);
  assert.match(migration, /overdue/);
});
