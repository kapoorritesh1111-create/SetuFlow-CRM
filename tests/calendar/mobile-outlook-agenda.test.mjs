import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobile = readFileSync('src/features/calendar/components/mobile-calendar-workspace.tsx', 'utf8');
const inviteRoute = readFileSync('src/app/api/mail/calendar-invite/route.ts', 'utf8');

test('mobile Calendar keeps SETU styling and supports agenda, week and month views', () => {
  assert.match(mobile, /bg-brand-800/);
  assert.match(mobile, /bg-surface-1/);
  assert.match(mobile, /text-content-primary/);
  assert.doesNotMatch(mobile, /bg-\[#0b72bb\]/);
  assert.match(mobile, /Search calendar/);
  assert.match(mobile, /CalendarView = 'agenda' \| 'week' \| 'month'/);
  assert.match(mobile, /WeekView/);
  assert.match(mobile, /MonthView/);
  assert.match(mobile, /Today/);
  assert.match(mobile, /Tomorrow/);
  assert.match(mobile, /No plans yet/);
  assert.match(mobile, /fixed bottom-\[82px\]/);
  assert.match(mobile, /Create calendar event/);
  assert.match(mobile, /fetch\('\/api\/calendar'/);
  assert.match(mobile, /PATCH/);
  assert.match(mobile, /method:'DELETE'/);
  assert.match(mobile, /CalendarPeopleInput/);
});

test('mobile Calendar opens a first-class event detail before editing', () => {
  assert.match(mobile, /MobileEventDetail/);
  assert.match(mobile, /Organizer/);
  assert.match(mobile, /Join meeting/);
  assert.match(mobile, /Reminder/);
  assert.match(mobile, /onEdit/);
  assert.match(mobile, /Pencil/);
});

test('mobile Calendar supports RSVP and recurring occurrence or series cancellation', () => {
  assert.match(mobile, /Accept/);
  assert.match(mobile, /Tentative/);
  assert.match(mobile, /Decline/);
  assert.match(mobile, /calendar-invite/);
  assert.match(mobile, /This event only/);
  assert.match(mobile, /Entire series/);
  assert.match(mobile, /scope=\$\{scope\}/);
});

test('imported invitations inherit a default reminder when none exists', () => {
  assert.match(inviteRoute, /ensureDefaultReminder/);
  assert.match(inviteRoute, /default_reminder_minutes/);
  assert.match(inviteRoute, /default_reminder_channels/);
  assert.match(inviteRoute, /calendar_reminders/);
  assert.match(inviteRoute, /15/);
});

test('mobile Calendar search remains client-side presentation only', () => {
  assert.match(mobile, /filteredEvents/);
  assert.match(mobile, /calendar_attendees/);
  assert.match(mobile, /event\.meeting_provider/);
  assert.doesNotMatch(mobile, /fetch\(`\/api\/calendar\?q=/);
});
