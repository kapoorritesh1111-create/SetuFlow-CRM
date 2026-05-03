import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const tradeEventsPage = readFileSync('src/app/(app)/trade-events/page.tsx', 'utf8');
const appShell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');

test('trade events page uses premium command center sections', () => {
  assert.match(tradeEventsPage, /Event Pipeline/);
  assert.match(tradeEventsPage, /Capture\. Qualify\. Follow up\. Close\./);
  assert.match(tradeEventsPage, /Active Events/);
  assert.match(tradeEventsPage, /Intake Queue/);
  assert.match(tradeEventsPage, /Today's Focus/);
  assert.match(tradeEventsPage, /Capture buyer/);
  assert.match(tradeEventsPage, /Capture supplier/);
  assert.match(tradeEventsPage, /Scan card/);
  assert.match(tradeEventsPage, /Dictate note/);
});

test('trade events page removes internal proof and prototype language', () => {
  assert.doesNotMatch(tradeEventsPage, /Proof boundary/i);
  assert.doesNotMatch(tradeEventsPage, /desktop-first/i);
  assert.doesNotMatch(tradeEventsPage, /not proof/i);
  assert.doesNotMatch(tradeEventsPage, /claiming quote handoff proof/i);
  assert.doesNotMatch(tradeEventsPage, /Offline queue sync/i);
  assert.doesNotMatch(tradeEventsPage, /Mobile-native scope/i);
});

test('desktop header integrates trade events add event action', () => {
  assert.match(appShell, /pathname\.startsWith\('\/trade-events'\) \? '\/admin\/trade-events' : '\/trade-events'/);
  assert.match(appShell, /Add Event/);
});
