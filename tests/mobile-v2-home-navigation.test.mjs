import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
const nav = readFileSync('src/features/mobile/components/mobile-bottom-tabs.tsx','utf8');
test('mobile dashboard quick actions use existing real destinations', () => {
  for (const route of ['/mobile/capture','/trade-events','/leads?quickLead=1']) assert.ok(source.includes(`href: '${route}'`));
  const actions = source.split('aria-label="Mobile quick actions"')[1]?.split('<MetricGrid>')[0] ?? '';
  for (const duplicate of ["href: '/quotes'", "href: '/orders'"]) assert.ok(!actions.includes(duplicate), `Duplicate quick action: ${duplicate}`);
  assert.match(source, /aria-label="Mobile quick actions"/);
});
test('mobile hero does not invent live data on missing dashboard props', () => {
  assert.doesNotMatch(source, /'open-leads'\) : 12/);
  assert.doesNotMatch(source, /'overdue-followups'\) : 34/);
  assert.doesNotMatch(source, /'active-quotes'\) : 5/);
});
test('mobile nav retains its established five-tab structure',()=>{
  assert.match(nav,/grid-cols-5/);
  assert.match(nav,/primaryTabs\.map/);
  assert.match(nav,/\bMore\b/);
});

test('Mobile 3.0 primary sales dashboard links to the real approved pricing route', () => {
  assert.match(source, /href: '\/quick-quote', label: 'Quick Quote'/);
  assert.match(source, /hasCrm \?/);
});

test('mobile Guru dictation is user-reviewed and does not auto-submit', () => {
  const guru = readFileSync('src/app/(mobile)/mobile/guru/page.tsx', 'utf8');
  assert.match(guru, /SpeechRecognition/);
  assert.match(guru, /setInput\(\(previous\)/);
  assert.match(guru, /aria-label=\{voiceState === 'listening' \? 'Stop dictation' : 'Dictate question'\}/);
  assert.match(guru, /if \(!res.ok\) throw/);
  assert.doesNotMatch(guru.split('recognition.onresult =')[1]?.split('recognition.onerror =')[0] ?? '', /send\(/);
});

test('mobile standalone home does not claim a live KPI pulse without dashboard data', () => {
  const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
  assert.doesNotMatch(home, /<MobileHomeHero\s*\/>/);
  assert.match(home, /getEnabledModuleSet\(grants\)/);
});

test('mobile Quick Quote shows usable price cards without overriding the pricing engine', () => {
  const quote = readFileSync('src/features/quotes/components/quick-quote-workbench.tsx', 'utf8');
  assert.match(quote, /Mobile quantity price comparison/);
  assert.match(quote, /sm:hidden/);
  assert.match(quote, /hidden overflow-x-auto sm:block/);
  assert.match(quote, /requestedPrice>displayPrice/);
  assert.match(quote, /r\.perKg\?r\.perKg:r\.unit/);
  assert.match(quote, /previewPackagingPricingV5/);
  assert.match(quote, /previewPackagingFramePricingV5/);
  assert.match(quote, /previewStarkLabelQuote/);
});
