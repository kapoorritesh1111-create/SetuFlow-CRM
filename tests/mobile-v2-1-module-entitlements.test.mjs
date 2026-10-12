import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('grant resolver requires explicit rows and resolves deepest nested routes', () => {
  const source = read('src/lib/modules/module-grants.ts');
  assert.match(source, /if \(!grants \|\| grants\.length === 0\) return new Set<ModuleKey>\(\)/);
  assert.match(source, /\.sort\(\(a, b\) => b\.route\.length - a\.route\.length\)/);
  assert.doesNotMatch(source, /DEFAULT_ENABLED_MODULES/);
});

test('module grant API never advertises paid modules on missing workspace or query failure', () => {
  const source = read('src/app/api/modules/grants/route.ts');
  assert.match(source, /error: 'workspace_unavailable' \}, \{ status: 403 \}/);
  assert.match(source, /error: 'module_grants_unavailable' \}, \{ status: 503 \}/);
  assert.doesNotMatch(source, /enabledModules: MODULE_KEYS/);
  assert.match(source, /effectiveGrants\.filter\(\(grant\) => grant\.enabled\)/);
});

test('mobile primary tabs and More derive destinations from explicit grants', () => {
  const source = read('src/features/mobile/components/mobile-bottom-tabs.tsx');
  assert.match(source, /fetch\('\/api\/modules\/grants'/);
  assert.match(source, /configuredTabs.*filter\(\(tab\) => allowed\(tab\.href\)\)/);
  assert.match(source, /permittedMoreItems = mobileMoreNavItems\.filter/);
  assert.match(source, /permittedMoreItems\.map/);
});

test('mobile Home keeps no duplicate quote/order shortcuts and guards order/compliance metrics', () => {
  const source = read('src/features/mobile/components/mobile-navigation.tsx');
  const home = source.slice(source.indexOf('export function MobileDashboardHome'));
  assert.match(home, /hasOrders \? <MetricTile tone="accent"/);
  assert.match(home, /hasOrders \? <MetricTile tone="accent"/);
  assert.doesNotMatch(home.slice(home.indexOf('aria-label="Mobile quick actions"'), home.indexOf('<MetricGrid>')), /href: '\/orders'|href: '\/quotes'/);
});

test('admin is shown only when authenticated access is granted', () => { const nav = read('src/features/mobile/components/mobile-bottom-tabs.tsx'); const api = read('src/app/api/modules/grants/route.ts'); assert.match(api, /canAccessAdmin: workspace.canAccessAdmin/); assert.match(nav, /canAccessAdmin \? <Link href="\/admin\/overview"/); });
