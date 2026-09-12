import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');

test('mobile Mail exposes unread, Trash recovery/empty and swipe actions', () => {
  const mobile = read('src/features/mail/components/mobile-setu-mail-workspace.tsx');
  assert.match(mobile, /Mark unread/);
  assert.match(mobile, /Empty Trash/);
  assert.match(mobile, /Message recovered/);
  assert.match(mobile, /beginSwipe/);
  assert.match(mobile, /endSwipe/);
  assert.match(mobile, /Archive/);
  assert.match(mobile, /Move/);
  assert.match(mobile, /Delete forever/);
});

test('Trash endpoint permanently deletes only active mailbox Trash', () => {
  const route = read('src/app/api/mail/trash/route.ts');
  assert.match(route, /mailOrganizerContext/);
  assert.match(route, /\.eq\('organization_id', ctx\.organizationId\)/);
  assert.match(route, /\.eq\('mailbox_id', ctx\.mailbox\.id\)/);
  assert.match(route, /\.eq\('folder', 'trash'\)/);
});

test('notification center has one-click clear all', () => {
  const notifications = read('src/components/notifications/communication-notifications.tsx');
  assert.match(notifications, /const clearAll/);
  assert.match(notifications, />Clear all</);
  assert.match(notifications, /read_at: new Date\(\)\.toISOString\(\)/);
});

test('incoming calendar invite hides provider boilerplate and original raw invitation', () => {
  const invite = read('src/lib/calendar/incoming-mail-invite.ts');
  const message = read('src/app/api/mail/messages/[id]/route.ts');
  assert.match(invite, /conciseInviteNotes/);
  assert.match(invite, /Join meeting/);
  assert.doesNotMatch(invite, /Response will be saved to Setu Calendar/);
  assert.doesNotMatch(message, /Original invitation message/);
});

test('calendar accepts legitimate overlapping meetings', () => {
  const migration = read('supabase/migrations/20260912104500_calendar_allow_overlapping_events.sql');
  assert.match(migration, /drop constraint if exists calendar_events_no_overlap/);
});
