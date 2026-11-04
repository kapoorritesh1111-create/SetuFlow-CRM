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
