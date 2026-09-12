import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = path => readFileSync(path, 'utf8');

function loadReminderWindow() {
  const exports = {};
  const source = ts.transpileModule(read('src/lib/calendar/reminder-window.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require });
  return exports;
}

test('calendar reminder catch-up never sends Upcoming notifications after the event starts', () => {
  const { isCalendarReminderDue } = loadReminderWindow();
  const start = '2026-09-12T14:00:00.000Z';
  assert.equal(isCalendarReminderDue(start, 15, new Date('2026-09-12T13:45:00.000Z')), true);
  assert.equal(isCalendarReminderDue(start, 15, new Date('2026-09-12T13:50:00.000Z')), true);
  assert.equal(isCalendarReminderDue(start, 15, new Date('2026-09-12T14:00:00.000Z')), true);
  assert.equal(isCalendarReminderDue(start, 15, new Date('2026-09-12T14:00:00.001Z')), false);
  assert.equal(isCalendarReminderDue(start, 15, new Date('2026-09-12T13:44:59.999Z')), false);
});

test('mobile communication feed uses today-scoped RPC and marks duplicate reminder ids together', () => {
  const source = read('src/components/notifications/communication-notifications.tsx');
  assert.match(source, /setu_communication_notifications_today/);
  assert.match(source, /p_device_timezone/);
  assert.match(source, /related_ids/);
  assert.match(source, /\.in\('id', notice\.related_ids\?\.length \? notice\.related_ids : \[notice\.id\]\)/);
  assert.match(source, /Today's calendar reminders/);
  assert.doesNotMatch(source, /\.from\('notifications'\)[\s\S]{0,800}\.limit\(50\)/);
});

test('mobile Mail header exposes tappable search and full Outlook-style folder drawer below safe area', () => {
  const source = read('src/features/mail/components/mobile-setu-mail-workspace.tsx');
  const drawer = read('src/components/layout/mobile-communication-drawer.tsx');
  const css = read('src/components/layout/mobile-communication-surfaces.module.css');
  assert.match(source, /aria-label="Search mail"/);
  assert.match(source, /aria-label="Open mail folders and accounts"/);
  assert.match(source, /MobileCommunicationDrawer title="Mail folders"/);
  assert.match(source, /\[\.\.\.topFolders,\.\.\.moreFolders\]/);
  assert.match(source, /MobileMailboxSelector/);
  assert.match(drawer, /showModal\(\)/);
  assert.match(css, /safe-area-inset-top/);
  assert.match(css, /min-width: 44px/);
  assert.match(css, /min-height: 44px/);
});

test('mobile Calendar top control opens drawer and settings remains directly accessible', () => {
  const source = read('src/features/calendar/components/mobile-calendar-workspace.tsx');
  assert.match(source, /aria-label="Open calendar menu"/);
  assert.match(source, /MobileCommunicationDrawer title="Calendar"/);
  assert.match(source, /href="\/calendar\/settings"/);
  assert.match(source, /Calendar settings/);
  assert.match(source, /href="\/calendar\/booking"/);
  assert.match(source, /occurrenceStart/);
});

test('today-notification migration scopes by authenticated user, local day, cancellation and recurrence override', () => {
  const sql = read('supabase/migrations/20260912053000_s41_today_communication_notifications.sql');
  assert.match(sql, /auth\.uid\(\)/);
  assert.match(sql, /is_org_member/);
  assert.match(sql, /calendar_preferences/);
  assert.match(sql, /calendar_availability/);
  assert.match(sql, /event_status <> 'cancelled'/);
  assert.match(sql, /recurrence_series_id=n\.entity_id/);
  assert.match(sql, /row_number\(\) over \(partition by occurrence_key/);
  assert.match(sql, /bool_or\(read\) over \(partition by occurrence_key\)/);
});
