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
