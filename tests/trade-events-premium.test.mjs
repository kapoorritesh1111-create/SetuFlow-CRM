import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync('src/app/(app)/trade-events/page.tsx', 'utf8');
const capturePage = readFileSync('src/app/(app)/trade-events/capture/page.tsx', 'utf8');
const offlineCapturePage = readFileSync('src/app/(app)/trade-events/offline-capture/page.tsx', 'utf8');
const offlineCaptureRoute = readFileSync('src/app/api/trade-events/offline-capture/route.ts', 'utf8');
const leadsPage = readFileSync('src/app/(app)/leads/page.tsx', 'utf8');
const leadDrawer = readFileSync('src/features/leads/components/lead-drawer.tsx', 'utf8');
const leadDrawerSingleton = readFileSync('src/features/leads/lib/lead-drawer-singleton.ts', 'utf8');
const leadsMobileSurface = readFileSync('src/features/leads/components/leads-mobile-surface.tsx', 'utf8');
const mobileBottomTabs = readFileSync('src/features/mobile/components/mobile-bottom-tabs.tsx', 'utf8');
const commandCenter = readFileSync('src/features/trade-events/components/trade-events-command-center.tsx', 'utf8');
const mobile = readFileSync('src/features/trade-events/components/trade-events-mobile-workspace.tsx', 'utf8');
const eventModeBanner = readFileSync('src/features/trade-events/components/event-mode-banner.tsx', 'utf8');
const offlineQueue = readFileSync('src/lib/trade-events/offline-capture-queue.ts', 'utf8');
const offlineSync = readFileSync('src/features/trade-events/components/trade-event-offline-sync.tsx', 'utf8');
const offlineCapture = readFileSync('src/features/trade-events/components/trade-event-offline-capture.tsx', 'utf8');
const captureDedupe = readFileSync('src/lib/trade-events/event-capture-dedupe.ts', 'utf8');
const eventAwareLeadSave = readFileSync('src/features/leads/server/lead-capture-event-aware-action.ts', 'utf8');
const quickLeadRoute = readFileSync('src/lib/trade-events/quick-lead-route.ts', 'utf8');
const query = readFileSync('src/lib/trade-events/query.ts', 'utf8');
const helpers = readFileSync('src/lib/trade-events/command-center.ts', 'utf8');
const viewModel = readFileSync('src/lib/trade-events/view-model.ts', 'utf8');
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
  assert.doesNotMatch(`${page}\n${commandCenter}`, /Bharat Tex 2026|Texworld USA|Apparel Sourcing Paris|setuGuruRecommendedEvents/);
});

test('command center loads booth readiness and normalized capture evidence', () => {
  assert.match(query, /booth_number, capture_defaults/);
  assert.match(query, /normalized_payload, raw_payload/);
  assert.match(query, /scheduled_tasks/);
  assert.match(query, /deal_value, deal_currency/);
});

test('command event selection sorts nearest upcoming event explicitly', () => {
  assert.match(helpers, /const upcoming = events/);
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

test('full CRM Capture Lead reuses one canonical Quick Lead drawer while trial capture stays isolated', () => {
  assert.match(quickLeadRoute, /quickLead/);
  assert.match(quickLeadRoute, /sourceType/);
  assert.match(quickLeadRoute, /sourceLabel/);
  assert.match(viewModel, /buildTradeEventQuickLeadHref/);
  assert.match(capturePage, /redirect\(buildTradeEventQuickLeadHref/);
  assert.match(capturePage, /TrialCapturePanel/);
  assert.doesNotMatch(capturePage, /EventQuickCapturePanel/);
  assert.match(leadsPage, /title: 'Quick lead'/);
  assert.match(leadsPage, /initialFastField=\{false\}/);
  assert.match(leadsMobileSurface, /RoleAwareLeadList/);
  assert.doesNotMatch(leadsMobileSurface, /MobileBusinessCardScanner/);
  assert.doesNotMatch(leadDrawerSingleton, /releaseListeners\.forEach/);
});

test('canonical Quick Lead keeps the initiating event id, name and buyer-supplier shortcut without changing its UI', () => {
  assert.match(leadsPage, /tradeEventId: eventId/);
  assert.match(leadsPage, /leadType: quickLeadType/);
  assert.match(leadDrawer, /props\.prefill\?\.tradeEventId/);
  assert.match(leadDrawer, /trade_event_id: props\.prefill\.tradeEventId/);
  assert.match(leadDrawer, /source_label: props\.prefill\.sourceLabel/);
  assert.match(leadDrawer, /props\.prefill\?\.leadType/);
});

test('mobile navigation keeps Events reachable after Quick Lead closes', () => {
  assert.match(mobileBottomTabs, /mobileMoreNavItems/);
  assert.match(mobileBottomTabs, /Tasks & Events/);
  assert.match(mobileBottomTabs, /Trade Event Command Center/);
  assert.match(mobileBottomTabs, /<span>More<\/span>/);
});

test('mobile event capture falls back to a durable offline queue and syncs automatically after reconnect', () => {
  assert.match(mobile, /OfflineAwareCaptureLink/);
  assert.match(mobile, /offline-capture/);
  assert.match(eventModeBanner, /Low signal\? Save offline/);
  assert.match(eventModeBanner, /offlineCaptureHref/);
  assert.match(offlineCapturePage, /TradeEventOfflineCapture/);
  assert.match(offlineQueue, /setu:trade-event-offline-queue:v1/);
  assert.match(offlineQueue, /clientCaptureId/);
  assert.match(offlineSync, /window\.addEventListener\('online'/);
  assert.match(offlineSync, /\/api\/trade-events\/offline-capture/);
  assert.match(offlineCapture, /saved on this device/i);
  assert.match(offlineCapture, /Signal dropped before Setu Flow confirmed the save/);
  assert.match(offlineCapture, /OfflineCaptureHttpError/);
  assert.match(offlineCapture, /Sync now/);
  assert.match(mobileBottomTabs, /TradeEventOfflineSync/);
});

test('offline event sync is idempotent and still uses canonical event-aware lead save', () => {
  assert.match(offlineCaptureRoute, /saveLead/);
  assert.match(offlineCaptureRoute, /client_capture_id/);
  assert.match(eventAwareLeadSave, /findSyncedOfflineCapture/);
  assert.match(eventAwareLeadSave, /offline:\$\{clientCaptureId\}/);
  assert.match(eventAwareLeadSave, /offline capture already synced/i);
  assert.match(eventAwareLeadSave, /client_capture_id/);
});

test('event Quick Lead enforces the initiating event as source regardless of scan method', () => {
  assert.match(eventAwareLeadSave, /formData\.set\('source_type', 'trade_show'\)/);
  assert.match(eventAwareLeadSave, /formData\.set\('source_label', String\(event\.name\)\)/);
  assert.match(eventAwareLeadSave, /trade_event_id/);
});

test('event Quick Lead links existing CRM identities and repeat conversations instead of creating duplicate leads', () => {
  assert.match(captureDedupe, /repeatEntry/);
  assert.match(captureDedupe, /exactLead/);
  assert.match(eventAwareLeadSave, /findEventCaptureIdentityMatch/);
  assert.match(eventAwareLeadSave, /trade_event_repeat_capture/);
  assert.match(eventAwareLeadSave, /No duplicate lead was created/);
  assert.match(eventAwareLeadSave, /converted_lead_id/);
});

test('event Quick Lead keeps event follow-up work visible to the Trade Command Center', () => {
  assert.match(eventAwareLeadSave, /scheduled_tasks/);
  assert.match(eventAwareLeadSave, /trade_event_quick_lead/);
  assert.match(eventAwareLeadSave, /next_follow_up_at/);
});

test('desktop shell still integrates Add Event navigation', () => {
  assert.match(appShell, /pathname\.startsWith\('\/trade-events'\) \? '\/admin\/trade-events' : '\/trade-events'/);
  assert.match(appShell, /Add Event/);
});
