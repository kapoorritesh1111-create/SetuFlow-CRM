import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/lib/routes/manifest.json', import.meta.url), 'utf8'));
const appShell = readFileSync(new URL('../src/components/layout/app-shell.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const dashboardPage = readFileSync(new URL('../src/app/(app)/dashboard/page.tsx', import.meta.url), 'utf8');
const dashboardTabs = readFileSync(new URL('../src/components/dashboard/dashboard-section-tabs.tsx', import.meta.url), 'utf8');
const profilePage = readFileSync(new URL('../src/app/(app)/profile/page.tsx', import.meta.url), 'utf8');
const vCardPage = readFileSync(new URL('../src/app/(app)/contact-exchange/vcard/page.tsx', import.meta.url), 'utf8');
const compactAvatarManager = readFileSync(new URL('../src/features/profile/components/profile-compact-avatar-manager.tsx', import.meta.url), 'utf8');
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

test('desktop account menu keeps profile page discoverable', () => {
  assert.equal(existsSync('src/app/(app)/profile/page.tsx'), true, 'authenticated profile page should exist');
  assert.match(appShell, /<DesktopUserMenu[\s\S]*profileName=\{profileName\}/, 'desktop header should render the user account menu');
  assert.match(appShell, /<Link href="\/profile"[\s\S]*Profile[\s\S]*<\/Link>/, 'desktop account menu should link to /profile');
  assert.match(appShell, /<span className="sr-only">Open user menu<\/span>/, 'avatar menu should expose an accessible label');
});

test('profile page stays compact and keeps vCard as a helper surface', () => {
  assert.match(profilePage, /ProfileCompactAvatarManager/, 'profile should use the compact avatar manager, not the full avatar gallery');
  assert.doesNotMatch(profilePage, /PageHeader/, 'profile should not render a duplicate page hero below the shell title');
  assert.doesNotMatch(profilePage, /MyCardWorkspace/, 'profile should not embed the full vCard workspace');
  assert.match(profilePage, /Profile basics/, 'profile should merge personal details and account context');
  assert.match(profilePage, /vCard helper/, 'profile should include a compact vCard readiness helper');
  assert.match(profilePage, /Manage vCard/, 'profile should hand off to the dedicated vCard workspace');
  assert.match(profilePage, /xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(320px,0\.65fr\)\]/, 'desktop profile should use a compact two-column layout');
  assert.match(compactAvatarManager, /Select avatar/, 'profile should open avatar selection from a compact action');
  assert.match(compactAvatarManager, /fixed inset-0/, 'avatar selection should be a modal, not a full page gallery');
  assert.match(vCardPage, /Back to Profile/, 'vCard workspace should provide a return path to Profile');
});
