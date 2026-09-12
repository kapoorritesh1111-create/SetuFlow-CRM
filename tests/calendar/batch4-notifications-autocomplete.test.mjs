import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = path => readFileSync(path, 'utf8');

test('Calendar attendee autocomplete reuses Contacts CRM and Mail history on desktop and mobile', () => {
  const people = read('src/features/calendar/components/calendar-people-input.tsx');
  const desktop = read('src/features/calendar/components/calendar-batch1-workspace.tsx');
  const mobile = read('src/features/calendar/components/mobile-calendar-workspace.tsx');
  const suggestions = read('src/app/api/mail/recipient-suggestions/route.ts');
  assert.match(people, /\/api\/mail\/recipient-suggestions\?q=/);
  assert.match(people, /value\.lastIndexOf\(','\)/);
  assert.match(people, /selected\.email/);
  assert.match(desktop, /CalendarPeopleInput ariaLabel="Required attendees"/);
  assert.match(desktop, /CalendarPeopleInput ariaLabel="Optional attendees"/);
  assert.match(mobile, /CalendarPeopleInput ariaLabel="Required attendees"/);
  assert.match(mobile, /CalendarPeopleInput ariaLabel="Optional attendees"/);
  assert.match(suggestions, /from\('contacts'\)/);
  assert.match(suggestions, /from\('leads'\)/);
  assert.match(suggestions, /historyOutbound/);
  assert.match(suggestions, /Promise\.resolve\(\{ data: \[\] \}\)/);
});

test('Calendar reminders atomically claim delivery before sending and release on failure', () => {
  const reminders = read('src/app/api/calendar/reminders/process/route.ts');
  assert.match(reminders, /from\('calendar_reminders'\)\.select\('\*'\)/);
  assert.match(reminders, /from\('calendar_events'\)\.select\('\*'\)\.in\('id', eventIds\)/);
  assert.match(reminders, /eventsById\.get\(reminder\.event_id\)/);
  assert.match(reminders, /missingEvents \+= 1/);
  assert.match(reminders, /async function claimDelivery/);
  assert.match(reminders, /from\('calendar_reminder_deliveries'\)\.insert/);
  assert.match(reminders, /error\.code === '23505'/);
  assert.match(reminders, /claimed = await claimDelivery/);
  assert.match(reminders, /if \(!claimed\)/);
  assert.match(reminders, /await releaseDelivery\(db, reminder, occurrence\.toISOString\(\)\)/);
  assert.match(reminders, /dispatchCommunicationNotification/);
  assert.match(reminders, /type: 'calendar_reminder'/);
  assert.match(reminders, /actionUrl: `\/calendar\?eventId=/);
  assert.match(reminders, /status: failed > 0 \? 500 : 200/);
});

test('Calendar notification deep links open the event editor on desktop and mobile', () => {
  const desktop = read('src/features/calendar/components/calendar-batch1-workspace.tsx');
  const mobile = read('src/features/calendar/components/mobile-calendar-workspace.tsx');
  assert.match(desktop, /params\.get\('eventId'\)/);
  assert.match(desktop, /openedEventParam\.current = eventId/);
  assert.match(desktop, /setComposerOpen\(true\)/);
  assert.match(mobile, /params\.get\('eventId'\)/);
  assert.match(mobile, /openedEventParam\.current = eventId/);
  assert.match(mobile, /setComposerOpen\(true\)/);
});
