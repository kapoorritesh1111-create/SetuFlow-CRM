import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const workspace = fs.readFileSync('src/features/calendar/components/calendar-batch1-workspace.tsx', 'utf8');
const inviteDelivery = fs.readFileSync('src/lib/calendar/invite-delivery.ts', 'utf8');
const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');

test('Calendar invitations use an assigned verified Setu sending mailbox before generic fallback', () => {
  assert.match(inviteDelivery, /mail_mailbox_access/);
  assert.match(inviteDelivery, /\.eq\('can_send', true\)/);
  assert.match(inviteDelivery, /mail_mailboxes/);
  assert.match(inviteDelivery, /is_primary/);
  assert.match(inviteDelivery, /RESEND_FROM_EMAIL/);
  assert.match(inviteDelivery, /No verified Setu sending mailbox is available/);
  assert.doesNotMatch(inviteDelivery, /if\(!apiKey\|\|!from\)/);
});

test('Calendar event save has one server-owned Zoom and invitation lifecycle', () => {
  assert.match(calendarApi, /createZoomMeetingForEvent/);
  assert.match(calendarApi, /sendInvites/);
  assert.doesNotMatch(workspace, /\/api\/calendar\/zoom\/meeting/);
  assert.doesNotMatch(workspace, /\/api\/calendar\/invite/);
  assert.match(workspace, /result\.warnings/);
  assert.match(workspace, /Event saved, but/);
});

test('Week and Day views retain all 24 hours while focusing near working hours', () => {
  assert.match(workspace, /const startMinutes = 0/);
  assert.match(workspace, /const endMinutes = 24 \* 60/);
  assert.match(workspace, /Array\.from\(\{ length: 24 \}/);
  assert.match(workspace, /Array\.from\(\{ length: 48 \}/);
  assert.match(workspace, /focusMinutes/);
  assert.match(workspace, /scroller\.scrollTop/);
  assert.match(workspace, /full 24-hour day remains available when you scroll/);
});
