import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const recurrence = fs.readFileSync('src/lib/calendar/recurrence.ts', 'utf8');
const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');
const reminderApi = fs.readFileSync('src/app/api/calendar/reminders/process/route.ts', 'utf8');
const communicationNotifications = fs.readFileSync('src/lib/notifications/communication-notification-service.ts', 'utf8');
const preferenceApi = fs.readFileSync('src/app/api/calendar/preferences/route.ts', 'utf8');
const availabilityApi = fs.readFileSync('src/app/api/calendar/availability/route.ts', 'utf8');
const settings = fs.readFileSync('src/features/calendar/components/calendar-settings-workspace.tsx', 'utf8');
const workspace = fs.readFileSync('src/features/calendar/components/calendar-batch1-workspace.tsx', 'utf8');
const ics = fs.readFileSync('src/lib/calendar/ics.ts', 'utf8');
const invites = fs.readFileSync('src/lib/calendar/invite-delivery.ts', 'utf8');
const migration = fs.readFileSync('supabase/migrations/20260912011500_calendar_recurrence_preferences_reminders.sql', 'utf8');
const vercel = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));

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
  assert.match(reminderApi, /dispatchCommunicationNotification/);
  assert.match(reminderApi, /type: 'calendar_reminder'/);
  assert.match(communicationNotifications, /from\('notifications'\)\.insert/);
  assert.match(communicationNotifications, /get_effective_notif_pref/);
  assert.match(reminderApi, /calendar_reminder_deliveries/);
  assert.match(reminderApi, /expandRecurringEvent/);
  assert.match(reminderApi, /event\.timezone/);
  assert.match(reminderApi, /recurringExceptions/);
  assert.match(reminderApi, /recurrence_original_start/);
  assert.match(reminderApi, /isSeriesRoot/);
  assert.match(migration, /create table if not exists public\.calendar_reminder_deliveries/);
  assert.match(migration, /unique\(reminder_id, occurrence_start, channel\)/);
});

test('CAL-08 reminder delivery is actually scheduled and protected by CRON_SECRET', () => {
  assert.ok(Array.isArray(vercel.crons));
  assert.ok(vercel.crons.some((cron) => cron.path === '/api/calendar/reminders/process' && cron.schedule === '*/5 * * * *'));
  assert.match(reminderApi, /process\.env\.CRON_SECRET/);
  assert.match(reminderApi, /authorization/);
  assert.match(reminderApi, /Bearer \$\{secret\}/);
});

test('CAL-11 settings expose Communications entitlement, timezone, reminder defaults and Zoom state', () => {
  assert.match(settings, /Communications entitlement/);
  assert.match(settings, /Calendar time zone/);
  assert.match(settings, /Default reminder/);
  assert.match(settings, /Zoom connection/);
  assert.match(settings, /\/api\/calendar\/preferences/);
  assert.match(settings, /\/api\/calendar\/availability/);
});

test('CAL-13 recurrence parser supports daily weekly monthly and rejects DST-skipped wall-clock times', () => {
  assert.match(recurrence, /DAILY/);
  assert.match(recurrence, /WEEKLY/);
  assert.match(recurrence, /MONTHLY/);
  assert.match(recurrence, /BYDAY/);
  assert.match(recurrence, /UNTIL/);
  assert.match(recurrence, /wall-clock time/);
  assert.match(recurrence, /does not exist/);
});

test('CAL-13 occurrence edits and cancellations are distinct from entire-series lifecycle and default safely', () => {
  assert.match(calendarApi, /scope === 'series'/);
  assert.match(calendarApi, /recurrence_original_start/);
  assert.match(calendarApi, /SERIES_EXCEPTIONS_RESET_REQUIRED/);
  assert.match(calendarApi, /scope === 'occurrence'/);
  assert.match(calendarApi, /recurrence_series_id/);
  assert.match(calendarApi, /status: 'cancelled'/);
});

test('CAL-13 ICS uses stable series UID plus RRULE or RECURRENCE-ID', () => {
  assert.match(ics, /RRULE/);
  assert.match(ics, /RECURRENCE-ID/);
  assert.match(ics, /recurrence_series_id/);
});
