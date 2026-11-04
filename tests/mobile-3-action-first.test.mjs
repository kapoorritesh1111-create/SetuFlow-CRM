import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
const capture = readFileSync('src/features/mobile/components/quick-capture-sheet.tsx', 'utf8');
const nav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');

test('mobile home reads grants and only links to real authenticated workflows', () => {
  assert.match(home, /fetch\('\/api\/modules\/grants'/);
  assert.match(home, /getEnabledModuleSet\(grants\)/);
  for (const route of ['/leads', '/quick-quote', '/tasks', '/trade-events', '/mobile/guru', '/contact-exchange/vcard']) {
    assert.ok(home.includes(route), 'missing real destination: ' + route);
  }
  assert.doesNotMatch(home, /Mehta Foods|Rahul Sharma|Demo captured|CRM sync queued/);
});

test('capture shortcuts do not bypass module grants or simulate writes', () => {
  assert.match(nav, /canCreateLeads=\{topModules\.has\('full_crm'\)\}/);
  assert.match(nav, /canUseTradeShow=\{topModules\.has\('trade_show'\)\}/);
  assert.match(capture, /canCreateLeads \?/);
  assert.match(capture, /canUseTradeShow \?/);
  for (const route of ['/mobile/capture', '/leads?quickLead=1', '/quick-quote', '/trade-events']) {
    assert.ok(capture.includes(route), 'missing workflow: ' + route);
  }
  assert.match(capture, /aria-modal="true"/);
  assert.match(capture, /aria-label="Close quick capture"/);
  assert.doesNotMatch(capture, /Works offline — syncs automatically|CRM sync and WhatsApp queued/);
});

test('offline trade capture queue never reports queued visitors as delivered', () => {
  const sync = readFileSync('src/features/trade-events/components/trade-event-offline-sync.tsx', 'utf8');
  assert.match(sync, /listOfflineTradeCaptures/);
  assert.match(sync, /retryOfflineTradeCapture/);
  assert.match(sync, /Queued is not delivered/);
  assert.match(sync, /aria-live="polite"/);
});

test('existing lead note dictation can be stopped and appends only new transcript results', () => {
  const drawer = readFileSync('src/features/leads/components/drawer/lead-drawer-implementation.tsx', 'utf8');
  assert.match(drawer, /noteRecognitionRef\.current\.stop\(\)/);
  assert.match(drawer, /results\)\.slice\(current\.resultIndex \?\? 0\)/);
  assert.match(drawer, /Review the note before saving/);
  assert.match(drawer, /Nothing was saved automatically/);
});

test('owner dashboard shortcuts require authenticated admin and module grants', () => {
  const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
  assert.match(home, /setCanAccessAdmin\(data\.canAccessAdmin === true\)/);
  assert.match(home, /canAccessAdmin && crm \?/);
  assert.match(home, /canAccessAdmin \?/);
  assert.match(home, /analytics \?/);
  assert.match(home, /communications \?/);
  assert.doesNotMatch(home, /\broleLabel === 'owner'/);
});
