import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/lib/routes/manifest.json', import.meta.url), 'utf8'));
const appShell = readFileSync(new URL('../src/components/layout/app-shell.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const dashboardPage = readFileSync(new URL('../src/app/(app)/dashboard/page.tsx', import.meta.url), 'utf8');
const dashboardTabs = readFileSync(new URL('../src/components/dashboard/dashboard-section-tabs.tsx', import.meta.url), 'utf8');
const { requiredFiles, forbiddenPaths } = manifest.tests;
const primaryNav = manifest.primaryNav.map((item) => item.href);
const leadershipSection = manifest.shellSections.find((section) => section.id === 'leadership-watchtower');
const leadershipNav = leadershipSection.items.map((item) => item.href);

const dashboardTabLabels = ['Home', 'Analytics', 'Reports'];

test('canonical product routes and cleanup docs exist', () => {
  requiredFiles.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
});

test('forbidden internal legacy surfaces are absent', () => {
  forbiddenPaths.forEach((path) => assert.equal(existsSync(path), false, `${path} should be absent`));
});

test('canonical manifest keeps the operator path visible in primary navigation', () => {
  assert.deepEqual(primaryNav.slice(0, 6), [
    '/contact-exchange/scan',
    '/leads',
    '/quotes',
    '/approval-send',
    '/orders',
    '/pipeline',
  ]);
  assert.equal(primaryNav.includes('/products'), true, 'catalog should remain in primary navigation');
  assert.equal(primaryNav.includes('/settings/lists'), true, 'settings should remain in primary navigation');
  assert.equal(primaryNav.includes('/dashboard'), true, 'home dashboard should remain in primary navigation');
  assert.equal(primaryNav.includes('/dashboard/analytics'), false, 'analytics should not be a separate primary navigation door');
  assert.equal(primaryNav.includes('/reports'), false, 'reports should not be a separate primary navigation door');
  assert.equal(primaryNav.at(-1), '/dashboard', 'home dashboard should be present as the final support surface');
});

test('dashboard tabs keep legacy analytics and reports routes compatible', () => {
  assert.equal(manifest.routes.app.dashboard, '/dashboard');
  assert.equal(manifest.routes.app.reports, '/reports');
  assert.equal(requiredFiles.includes('src/app/(app)/dashboard/analytics/page.tsx'), true, 'analytics compatibility route should remain required');
  assert.equal(requiredFiles.includes('src/app/(app)/reports/page.tsx'), true, 'reports compatibility route should remain required');
  assert.equal(leadershipNav.includes('/dashboard'), true, 'home should stay visible in leadership shell navigation');
  assert.equal(leadershipNav.includes('/dashboard/analytics'), true, 'analytics should remain available as a Home dashboard tab route');
  assert.equal(leadershipNav.includes('/reports'), true, 'reports should remain available as a Home dashboard tab route');
  for (const label of dashboardTabLabels) assert.match(dashboardTabs, new RegExp(`label: '${label}'`), `${label} tab should be declared`);
  assert.match(dashboardPage, /<DashboardSectionTabs active="home" \/>/, 'Home dashboard should render the tab shell before the existing dashboard view');
});

test('desktop sidebar presents one Home dashboard door instead of separate Analytics and Reports doors', () => {
  assert.match(appShell, /expandedLabel: 'Dashboard'/, 'app shell source still carries the legacy Dashboard text until CSS presents it as Home');
  assert.match(globals, /aside nav a\[href\^="\/dashboard\/analytics"\]/, 'desktop CSS should hide Analytics as a separate sidebar door');
  assert.match(globals, /aside nav a\[href\^="\/reports"\]/, 'desktop CSS should hide Reports as a separate sidebar door');
  assert.match(globals, /content: "Home";/, 'desktop CSS should present the dashboard item as Home');
});
