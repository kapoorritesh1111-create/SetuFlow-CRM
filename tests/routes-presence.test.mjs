import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/lib/routes/manifest.json', import.meta.url), 'utf8'));
const appShell = readFileSync(new URL('../src/components/layout/app-shell.tsx', import.meta.url), 'utf8');
const notificationCenter = readFileSync(new URL('../src/components/notifications/in-app-notification-center.tsx', import.meta.url), 'utf8');
const globals = readFileSync(new URL('../src/app/globals.css', import.meta.url), 'utf8');
const dashboardPage = readFileSync(new URL('../src/app/(app)/dashboard/page.tsx', import.meta.url), 'utf8');
const dashboardTabs = readFileSync(new URL('../src/components/dashboard/dashboard-section-tabs.tsx', import.meta.url), 'utf8');
const profilePage = readFileSync(new URL('../src/app/(app)/profile/page.tsx', import.meta.url), 'utf8');
const vCardPage = readFileSync(new URL('../src/app/(app)/contact-exchange/vcard/page.tsx', import.meta.url), 'utf8');
const compactAvatarManager = readFileSync(new URL('../src/features/profile/components/profile-compact-avatar-manager.tsx', import.meta.url), 'utf8');
const vCardContactEditor = readFileSync(new URL('../src/features/profile/components/profile-vcard-contact-editor.tsx', import.meta.url), 'utf8');
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

test('profile page stays compact and keeps vCard as an editable helper surface', () => {
  assert.match(profilePage, /ProfileCompactAvatarManager/, 'profile should use the compact avatar manager, not the full avatar gallery');
  assert.match(profilePage, /ProfileVcardContactEditor/, 'profile should render the editable vCard contact helper');
  assert.doesNotMatch(profilePage, /PageHeader/, 'profile should not render a duplicate page hero below the shell title');
  assert.doesNotMatch(profilePage, /MyCardWorkspace/, 'profile should not embed the full vCard workspace');
  assert.match(profilePage, /Profile basics/, 'profile should merge personal details and account context');
  assert.match(vCardContactEditor, /vCard helper/, 'profile should include a compact vCard readiness helper');
  assert.match(vCardContactEditor, /Contact preview/, 'profile helper should show contact preview details, not an abstract completion score');
  assert.doesNotMatch(vCardContactEditor, /recommended public-contact fields are complete/, 'profile helper should not show a numeric vCard completion score');
  assert.doesNotMatch(vCardContactEditor, /Share link/, 'profile should not show public share links generated by Share vCard');
  for (const label of ['Phone', 'Website', 'LinkedIn', 'Instagram']) assert.match(vCardContactEditor, new RegExp(`label: '${label}'`), `${label} should be editable in the profile contact preview`);
  assert.match(vCardContactEditor, /Save contact details/, 'profile helper should save visible contact fields directly');
  assert.match(vCardContactEditor, /\/api\/my-card-settings/, 'profile helper should persist through the existing vCard settings API');
  assert.match(vCardContactEditor, /Manage vCard/, 'profile should hand off to the dedicated vCard workspace');
  assert.match(profilePage, /xl:grid-cols-\[minmax\(0,1\.35fr\)_minmax\(320px,0\.65fr\)\]/, 'desktop profile should use a compact two-column layout');
  assert.match(compactAvatarManager, /Select avatar/, 'profile should open avatar selection from a compact action');
  assert.match(compactAvatarManager, /fixed inset-0/, 'avatar selection should be a modal, not a full page gallery');
  assert.match(vCardPage, /Back to Profile/, 'vCard workspace should provide a return path to Profile');
});

test('persistent desktop shell closes profile and notification popovers across navigation', () => {
  assert.doesNotMatch(appShell, /<details className="group relative">/, 'profile menu should not rely on persistent native details state');
  assert.match(appShell, /setOpen\(false\)/, 'profile menu should close by controlled state');
  assert.match(appShell, /\[pathname\]/, 'profile and notification shell state should respond to route changes');
  assert.match(appShell, /closeIfOutside/, 'profile menu should close when clicking outside');
  assert.match(appShell, /closeOnEscape/, 'profile menu should close on Escape');
  assert.match(appShell, /notificationResetKey/, 'notification center should be remountable to clear persisted open state');
  assert.match(appShell, /onOpenMenu=\{closeNotificationCard\}/, 'opening the profile menu should close any open notification card');
});

test('notification center links alerts to relevant records or model entities', () => {
  assert.match(notificationCenter, /safeRelativeActionUrl/, 'notification links should only use safe relative action URLs');
  assert.match(notificationCenter, /routeForNotification/, 'notifications without explicit action URLs should resolve a model route');
  assert.match(notificationCenter, /lead\|follow\[-_\\s\]\?up\|contact/, 'lead and follow-up notifications should resolve to lead routes');
  assert.match(notificationCenter, /Open linked record/, 'notification CTA should clearly open the linked record');
  assert.match(notificationCenter, /entity_ref: row\.lead_id \? `lead:\$\{row\.lead_id\}`/, 'derived lead alerts should keep the lead id in entity_ref for deep-link recovery');
});
