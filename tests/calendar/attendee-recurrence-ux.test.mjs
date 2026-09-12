import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const workspace = fs.readFileSync('src/features/calendar/components/calendar-batch1-workspace.tsx', 'utf8');
const recurrence = fs.readFileSync('src/lib/calendar/recurrence.ts', 'utf8');
const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');

test('meeting editor surfaces attendee RSVP response separately from availability', () => {
  assert.match(workspace, /attendeeResponseLabel/);
  assert.match(workspace, /Accepted/);
  assert.match(workspace, /Tentative/);
  assert.match(workspace, /Declined/);
  assert.match(workspace, /Awaiting response/);
  assert.match(workspace, /RSVP · \{acceptedCount\}\/\{attendeeCount\} accepted/);
  assert.match(workspace, /Availability and RSVP response/);
  assert.match(workspace, /RSVP status comes from the invitation response/);
  assert.match(workspace, /Availability unknown/);
  assert.match(calendarApi, /calendar_attendees\(\*\)/);
  assert.match(calendarApi, /rsvp_status: current\?\.rsvp_status/);
});

test('weekly recurrence lets the user choose multiple weekdays and persists them through BYDAY', () => {
  assert.match(workspace, /WEEKDAY_PICKER/);
  assert.match(workspace, /repeatDays/);
  assert.match(workspace, /toggleRepeatDay/);
  assert.match(workspace, /Repeat on/);
  assert.match(workspace, /byDay: repeatDays/);
  assert.match(workspace, /Choose at least one day for the weekly repeat/);
  assert.match(recurrence, /options\.byDay/);
  assert.match(recurrence, /BYDAY=\$\{selectedDays\.map/);
  assert.match(recurrence, /new Set\(requestedDays\.filter/);
});

test('recurring series may have an inclusive optional end date backed by UNTIL', () => {
  assert.match(workspace, /repeatUntil/);
  assert.match(workspace, /type="date"/);
  assert.match(workspace, /Last recurrence date/);
  assert.match(workspace, /Leave blank for no end date/);
  assert.match(workspace, /untilDate: repeatUntil \|\| null/);
  assert.match(workspace, /repeat end date cannot be before the meeting start date/);
  assert.match(recurrence, /formatUntilDate/);
  assert.match(recurrence, /UNTIL=\$\{until\}/);
});

test('recurring edits and cancellations require an explicit occurrence-or-series choice', () => {
  assert.match(workspace, /function RecurringScopeDialog/);
  assert.match(workspace, /Edit recurring meeting/);
  assert.match(workspace, /Cancel recurring meeting/);
  assert.match(workspace, /This occurrence/);
  assert.match(workspace, /Entire series/);
  assert.match(workspace, /Cancel this occurrence/);
  assert.match(workspace, /Cancel entire series/);
  assert.match(workspace, /editScopePromptOpen/);
  assert.match(workspace, /deleteScopePromptOpen/);
  assert.match(calendarApi, /requestedScope === 'series'/);
  assert.match(calendarApi, /target\.kind === 'occurrence'/);
});
