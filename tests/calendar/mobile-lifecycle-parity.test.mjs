import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const mobile = fs.readFileSync('src/features/calendar/components/mobile-calendar-workspace.tsx', 'utf8');

test('Mobile Calendar opens a real create composer instead of routing to a desktop-only compose flag', () => {
  assert.match(mobile, /setComposerOpen\(true\)/);
  assert.match(mobile, /Create event/);
  assert.doesNotMatch(mobile, /href=\"\/calendar\?compose=1\"/);
});

test('Mobile Calendar editing reuses the authoritative calendar lifecycle API', () => {
  assert.match(mobile, /method: event \? 'PATCH' : 'POST'/);
  assert.match(mobile, /fetch\('\/api\/calendar'/);
  assert.doesNotMatch(mobile, /\/api\/calendar\/invite/);
  assert.doesNotMatch(mobile, /\/api\/calendar\/zoom\/meeting/);
  assert.match(mobile, /warningMessages\(result\)/);
  assert.match(mobile, /Event saved, but/);
});

test('Mobile Calendar cancellation surfaces lifecycle failures and warnings', () => {
  assert.match(mobile, /method: 'DELETE'/);
  assert.match(mobile, /Unable to cancel event/);
  assert.match(mobile, /Event cancelled, but/);
  assert.match(mobile, /Cancel this event and notify attendees/);
});
