import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/app/(app)/trade-events/page.tsx', 'utf8');
const commandCenter = readFileSync('src/features/trade-events/components/trade-events-command-center.tsx', 'utf8');
const mobile = readFileSync('src/features/trade-events/components/trade-events-mobile-workspace.tsx', 'utf8');
const query = readFileSync('src/lib/trade-events/query.ts', 'utf8');
const helpers = readFileSync('src/lib/trade-events/command-center.ts', 'utf8');
const identity = readFileSync('src/lib/trade-events/identity.ts', 'utf8');
const adminActions = readFileSync('src/features/admin/server/trade-event-actions.ts', 'utf8');
const appShell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');

test('trade events page delegates to the refreshed command center while preserving trial capability', () => {
  assert.match(page, /TradeEventsCommandCenter/);
  assert.match(page, /getTradeShowTrialCapabilityState/);
  assert.match(page, /getTradeEventsCommandCenterData/);
});

test('command center exposes operational desktop and mobile event views', () => {
  assert.match(commandCenter, /My Events/);
  assert.match(commandCenter, /Discover Events/);
  assert.match(commandCenter, /Past Events/);
  assert.match(commandCenter, /Verified recommendations only/);
  assert.match(mobile, /Scan card \/ badge/);
  assert.match(mobile, /Dictate note/);
  assert.match(mobile, /Capture next lead/);
});

test('hard-coded stale trade-event recommendations are removed', () => {
  const combined = `${page}\n${commandCenter}`;
  assert.doesNotMatch(combined, /Bharat Tex 2026|Texworld USA|Apparel Sourcing Paris|setuGuruRecommendedEvents/);
});

test('command center loads booth readiness and normalized capture evidence', () => {
  assert.match(query, /booth_number, capture_defaults/);
  assert.match(query, /normalized_payload, raw_payload/);
  assert.match(query, /scheduled_tasks/);
  assert.match(query, /deal_value, deal_currency/);
});

test('command event selection sorts nearest upcoming event explicitly', () => {
  assert.match(helpers, /upcoming\.sort|const upcoming = events/);
  assert.match(helpers, /timestamp\(left\.starts_on\) - timestamp\(right\.starts_on\)/);
  assert.match(helpers, /normalized_payload/);
});

test('event identity separates exact duplicates from possible matches', () => {
  assert.match(identity, /'exact' \| 'possible' \| 'none'/);
  assert.match(identity, /rangesOverlap/);
  assert.match(identity, /return 'possible'/);
  assert.match(adminActions, /classifyTradeEventMatch/);
  assert.match(adminActions, /event-duplicate/);
  assert.match(adminActions, /event-possible-duplicate/);
  assert.match(adminActions, /allow_duplicate/);
});

test('desktop shell still integrates Add Event navigation', () => {
  assert.match(appShell, /pathname\.startsWith\('\/trade-events'\) \? '\/admin\/trade-events' : '\/trade-events'/);
  assert.match(appShell, /Add Event/);
});
