import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const calendarApi = fs.readFileSync('src/app/api/calendar/route.ts', 'utf8');
const bookingApi = fs.readFileSync('src/app/api/calendar/booking/route.ts', 'utf8');
const desktop = fs.readFileSync('src/features/calendar/components/calendar-batch1-workspace.tsx', 'utf8');
const rsvp = fs.readFileSync('src/app/api/calendar/rsvp/[token]/route.ts', 'utf8');
const ics = fs.readFileSync('src/lib/calendar/ics.ts', 'utf8');
const zoom = fs.readFileSync('src/lib/calendar/zoom.ts', 'utf8');
const zoomLifecycle = fs.readFileSync('src/lib/calendar/zoom-lifecycle.ts', 'utf8');

test('Calendar lifecycle converts invitation delivery exceptions into warnings after save/cancel', () => {
  assert.match(calendarApi, /Calendar invitation delivery failed unexpectedly/);
  assert.match(calendarApi, /result\.partial/);
  assert.match(calendarApi, /invitation\(s\) could not be delivered/);
});

test('Desktop event cancellation matches mobile failure and lifecycle-warning behavior', () => {
  assert.match(desktop, /Cancel this event and notify attendees/);
  assert.match(desktop, /if \(!response\.ok\).*Unable to cancel event/s);
  assert.match(desktop, /Event cancelled, but/);
  assert.match(desktop, /Unable to cancel event right now/);
});

test('RSVP remains token-scoped and accepts only explicit calendar responses', () => {
  assert.match(rsvp, /const RESPONSES = new Set\(\['accepted', 'tentative', 'declined'\]\)/);
  assert.match(rsvp, /\.eq\('response_token', token\)/);
  assert.match(rsvp, /responded_via: 'setu_link'/);
  assert.match(rsvp, /This meeting has been cancelled/);
});

test('ICS hardening keeps all-day DTEND exclusive and adds Outlook busy compatibility', () => {
  assert.match(ics, /nextDateValue/);
  assert.match(ics, /requestedEndDate > startDate \? requestedEndDate : nextDateValue\(startDate\)/);
  assert.match(ics, /LAST-MODIFIED/);
  assert.match(ics, /X-MICROSOFT-CDO-BUSYSTATUS/);
  assert.match(ics, /X-WR-TIMEZONE/);
});

test('Zoom API retries once after a 401 by forcing refresh', () => {
  assert.match(zoom, /forceRefresh/);
  assert.match(zoom, /status !== 401/);
  assert.match(zoom, /getValidZoomAccessToken\(db, connection, \{ forceRefresh: true \}\)/);
  assert.match(zoom, /zoomApiWithRefresh/);
});

test('Zoom event lifecycle and public booking both use refresh-aware requests', () => {
  assert.match(zoomLifecycle, /zoomApiWithRefresh/);
  assert.match(bookingApi, /zoomApiWithRefresh/);
  assert.doesNotMatch(zoomLifecycle, /const token = await getValidZoomAccessToken/);
  assert.doesNotMatch(bookingApi, /const token = await getValidZoomAccessToken/);
});

test('Zoom cancellation is idempotent when the remote meeting is already gone', () => {
  assert.match(zoomLifecycle, /status === 404/);
  assert.match(zoomLifecycle, /remote_missing: true/);
  assert.match(zoomLifecycle, /action: 'cancelled'/);
});

test('Public booking keeps a confirmed slot even when provider or invitation delivery needs attention', () => {
  assert.match(bookingApi, /The time was booked, but Zoom could not be created/);
  assert.match(bookingApi, /calendar invitation delivery failed unexpectedly/);
  assert.match(bookingApi, /warnings,/);
});
