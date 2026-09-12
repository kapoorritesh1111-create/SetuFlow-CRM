import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const mobile = readFileSync('src/features/calendar/components/mobile-calendar-workspace.tsx', 'utf8');

test('mobile Calendar uses an Outlook-style agenda shell without changing the calendar lifecycle API', () => {
  assert.match(mobile, /bg-\[#0b72bb\]/);
  assert.match(mobile, /Search calendar/);
  assert.match(mobile, /weekDates/);
  assert.match(mobile, /Jump to/);
  assert.match(mobile, /Today/);
  assert.match(mobile, /Tomorrow/);
  assert.match(mobile, /No plans yet/);
  assert.match(mobile, /fixed bottom-\[82px\]/);
  assert.match(mobile, /Create calendar event/);
  assert.match(mobile, /fetch\('\/api\/calendar'/);
  assert.match(mobile, /method: event \? 'PATCH' : 'POST'/);
  assert.match(mobile, /method: 'DELETE'/);
  assert.match(mobile, /CalendarPeopleInput/);
});

test('mobile Calendar search remains client-side presentation only', () => {
  assert.match(mobile, /filteredEvents/);
  assert.match(mobile, /calendar_attendees/);
  assert.match(mobile, /event\.meeting_provider/);
  assert.doesNotMatch(mobile, /fetch\(`\/api\/calendar\?q=/);
});
