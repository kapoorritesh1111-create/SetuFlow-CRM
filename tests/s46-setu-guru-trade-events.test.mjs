import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tradeEventAssistant = readFileSync('src/lib/setu-guru/trade-event-assistant.ts', 'utf8');
const tradeEventPage = readFileSync('src/app/(app)/growth-agent/trade-events/[eventId]/page.tsx', 'utf8');
const tradeEventView = readFileSync('src/features/setu-guru/trade-event-assistant-view.tsx', 'utf8');
const growthAgentPage = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const growthCenter = readFileSync('src/features/setu-guru/growth-center.tsx', 'utf8');

test('Trade Event Assistant is organization scoped and read-only', () => {
  assert.match(tradeEventAssistant, /\.eq\('organization_id', orgId\)/);
  assert.doesNotMatch(tradeEventAssistant, /from\(['"]leads['"]\)\.(insert|update)/);
  assert.doesNotMatch(tradeEventAssistant, /from\(['"]quotes['"]\)\.(insert|update)/);
  assert.doesNotMatch(tradeEventAssistant, /send_email|sendEmail|send_whatsapp|sendWhatsApp/);
});

test('Trade Event Assistant covers pre-show prioritization, post-show follow-up, and a summary', () => {
  assert.match(tradeEventAssistant, /preShowPriorityList/);
  assert.match(tradeEventAssistant, /postShowFollowUpQueue/);
  assert.match(tradeEventAssistant, /summary:/);
  assert.match(tradeEventAssistant, /scoreFitAgainstIcp/);
});

test('Trade Event Assistant page and view are organization scoped and require workspace access', () => {
  assert.match(tradeEventPage, /requireWorkspace\(\)/);
  assert.match(tradeEventPage, /getTradeEventAssistant\(organizationId, params\.eventId\)/);
  assert.match(tradeEventView, /preShowPriorityList/);
  assert.match(tradeEventView, /postShowFollowUpQueue/);
});

test('Growth Center links out to per-event Trade Event Assistant pages', () => {
  assert.match(growthAgentPage, /trade_events/);
  assert.match(growthAgentPage, /\.eq\('organization_id', organizationId\)/);
  assert.match(growthCenter, /\/growth-agent\/trade-events\/\$\{event\.id\}/);
});
