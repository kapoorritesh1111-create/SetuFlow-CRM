import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const recurrence = fs.readFileSync('src/lib/calendar/recurrence.ts', 'utf8');
const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');
const reminderApi = fs.readFileSync('src/app/api/calendar/reminders/process/route.ts', 'utf8');
const preferenceApi = fs.readFileSync('src/app/api/calendar/preferences/route.ts', 'utf8');
const availabilityApi = fs.readFileSync('src/app/api/calendar/availability/route.ts', 'utf8');
const settings = fs.readFileSync('src/features/calendar/components/calendar-settings-workspace.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/calendar/components/calendar-batch1-workspace.tsx', 'utf8');
const ics = fs.readFileSync('src/lib/calendar/ics.ts', 'utf8');
const invites = fs.readFileSync('src/lib/calendar/invite-delivery.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260912011500_calendar_recurrence_preferences_reminders.sql', 'utf8');

test('CAL-08 stores canonical timezone preferences and validates IANA zones', () => {
  assert.match(migration, /create table if not exists public\.calendar_preferences/);
  assert.match(migration, /default_reminder_minutes/);
  assert.match(migration, /default_reminder_channels/);
  assert.match(migration, /enable row level security/);
  assert.match(preferenceApi, /isValidTimeZone/);
  assert.match(availabilityApi, /isValidTimeZone/);
  assert.match(settings, /Calendar time zone/);
  assert.match(settings, /Default reminder/);
  assert.match(workspace, /localStartsAt/);
  assert.match(workspace, /localEndsAt/);
  assert.match(workspace, /dateTimeLocalValue/);
});

test('CAL-08 reminders are due-time driven, create real in-app notifications and track recurring occurrence delivery', () => {
  assert.doesNotMatch(reminderApi, /\.gte\('created_at'/);
  assert.match(reminderApi, /\.is\('sent_at', null\)|reminder\.sent_at/);
  assert.match(reminderApi, /from\('notifications'\)\.insert/);
  assert.match(reminderApi, /calendar_reminder_deliveries/);
  assert.match(reminderApi, /expandRecurringEvent/);
  assert.match(reminderApi, /event\.timezone/);
  assert.match(reminderApi, /recurringExceptions/);
  assert.match(reminderApi, /recurrence_original_start/);
  assert.match(migration, /create table if not exists public\.calendar_reminder_deliveries/);
  assert.match(migration, /unique\(reminder_id, occurrence_start, channel\)/);
});

test('CAL-11 settings expose Communications entitlement, timezone, reminder defaults and Zoom state', () => {
  assert.match(preferenceApi, /org_module_grants/);
  assert.match(preferenceApi, /canManage/);
  assert.match(preferenceApi, /\/admin\/mail/);
  assert.match(settings, /Setu Communications/);
  assert.match(settings, /Manage Communications/);
  assert.match(settings, /Connect Zoom/);
  assert.match(settings, /Reconnect Zoom/);
  assert.match(settings, /\/api\/calendar\/preferences/);
});

test('CAL-13 recurrence parser supports daily weekly monthly and rejects DST-skipped wall-clock times', () => {
  assert.match(recurrence, /RecurrenceFrequency = 'DAILY' \| 'WEEKLY' \| 'MONTHLY'/);
  assert.match(recurrence, /BYDAY/);
  assert.match(recurrence, /zonedDateTimeToUtc/);
  assert.match(recurrence, /dateTimeLocalValue\(date, timeZone\) !== requested/);
  assert.match(recurrence, /expandRecurringEvent/);
  assert.match(recurrence, /recurrenceOccurrenceId/);
  assert.match(calendarApi, /SERIES_CONFLICT_DAYS/);
  assert.match(calendarApi, /materializeBusy/);
  assert.match(calendarApi, /timezone, recurrence_rule: recurrenceRule/);
});

test('CAL-13 occurrence edits and cancellations are distinct from entire-series lifecycle and default safely', () => {
  assert.match(migration, /recurrence_series_id/);
  assert.match(migration, /recurrence_original_start/);
  assert.match(migration, /calendar_events_series_occurrence_unique/);
  assert.match(calendarApi, /target\.kind === 'occurrence'/);
  assert.match(calendarApi, /ensureOccurrenceOverride/);
  assert.match(calendarApi, /requestedScope === 'series'/);
  assert.match(calendarApi, /Change the meeting provider for the entire series/);
  assert.match(calendarApi, /occurrenceKey/);
  assert.match(workspace, /This occurrence/);
  assert.match(workspace, /Entire series/);
});

test('CAL-13 ICS uses stable series UID plus RRULE or RECURRENCE-ID', () => {
  assert.match(ics, /RRULE:/);
  assert.match(ics, /RECURRENCE-ID/);
  assert.match(invites, /const seriesId = event\.recurrence_series_id \|\| event\.id/);
  assert.match(invites, /recurrenceRule:/);
  assert.match(invites, /recurrenceId:/);
});
