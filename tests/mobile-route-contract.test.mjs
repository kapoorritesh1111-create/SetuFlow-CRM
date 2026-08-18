import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const mobileRoutes = [
  'src/app/(mobile)/mobile/page.tsx',
  'src/app/(mobile)/mobile/leads/page.tsx',
  'src/app/(mobile)/mobile/quote/page.tsx',
  'src/app/(mobile)/mobile/capture/page.tsx',
  'src/app/(mobile)/mobile/notifications/page.tsx',
  'src/app/(mobile)/mobile/settings/page.tsx'
];

const mobileComponents = [
  'src/features/mobile/components/mobile-navigation.tsx',
  'src/features/mobile/components/mobile-bottom-tabs.tsx',
  'src/features/mobile/components/mobile-shell.tsx',
  'src/features/mobile/components/icon-3d-orb.tsx',
  'src/features/mobile/components/role-aware-lead-list.tsx',
  'src/features/mobile/components/lead-status-card.tsx',
  'src/features/mobile/components/mobile-cards.tsx',
  'src/features/mobile/lib/role-aware-leads.ts',
  'src/features/mobile/lib/mobile-feature-flag.ts'
];

test('mobile app v1 routes are isolated and feature flagged', () => {
  for (const route of mobileRoutes) assert.equal(existsSync(route), true, `${route} should exist`);
  for (const component of mobileComponents) assert.equal(existsSync(component), true, `${component} should exist`);
  const layout = readFileSync('src/app/(mobile)/mobile/layout.tsx', 'utf8');
  assert.match(layout, /isMobileAppV1Enabled/);
  const flag = readFileSync('src/features/mobile/lib/mobile-feature-flag.ts', 'utf8');
  assert.match(flag, /feature\/mobile_app_v1/);
});

test('desktop app route group remains separate from mobile route group', () => {
  assert.equal(existsSync('src/app/(app)/leads/page.tsx'), true);
  assert.equal(existsSync('src/app/(app)/quotes/page.tsx'), true);
  assert.equal(existsSync('src/app/(mobile)/mobile/leads/page.tsx'), true);
  const desktopLayout = readFileSync('src/app/(app)/layout.tsx', 'utf8');
  assert.doesNotMatch(desktopLayout, /features\/mobile/);
});

test('canonical leads route renders premium mobile leads without replacing desktop workspace', () => {
  const leadsPage = readFileSync('src/app/(app)/leads/page.tsx', 'utf8');
  const mobileSurface = readFileSync('src/features/leads/components/leads-mobile-surface.tsx', 'utf8');
  assert.match(leadsPage, /LeadsMobileSurface/);
  assert.match(leadsPage, /buildMobileLeadCardsFromAppData/);
  assert.match(leadsPage, /buildMobileSignedInSummary/);
  assert.match(leadsPage, /md:hidden/);
  assert.match(leadsPage, /hidden space-y-4 md:block/);
  assert.match(leadsPage, /LeadsWorkspace/);
  assert.match(mobileSurface, /RoleAwareLeadList/);
  assert.doesNotMatch(mobileSurface, /MobileBusinessCardScanner/);
});


test('canonical dashboard and leads use the blueprint-grade mobile shell on phone viewports', () => {
  const appShell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
  const dashboardPage = readFileSync('src/app/(app)/dashboard/_lib/render-dashboard-page.tsx', 'utf8');
  const mobileShell = readFileSync('src/features/mobile/components/mobile-shell.tsx', 'utf8');
  const mobileNav = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');

  assert.match(appShell, /shouldUseCanonicalMobileShell/);
  assert.match(appShell, /'\/dashboard', '\/leads', '\/orders'/);
  assert.match(appShell, /<MobileShell signedIn=\{signedInForMobile\} canonical>/);
  assert.match(appShell, /hidden md:block/);
  assert.match(dashboardPage, /MobileDashboardHome/);
  assert.match(dashboardPage, /<div className="md:hidden">/);
  assert.match(mobileShell, /data-mobile-shell=\{canonical \? 'canonical' : 'standalone'\}/);
  assert.match(mobileShell, /mobile-bottom-tabs/);
  assert.match(mobileNav, /canonicalMobileNavItems/);
  assert.match(mobileNav, /standaloneMobileNavItems/);
  assert.match(mobileNav, /Share vCard/);
});

test('mobile navigation is derived from the shared shell nav config and exposes Tasks plus Events under More', () => {
  const sharedNav = readFileSync('src/lib/navigation/nav-items.ts', 'utf8');
  const shellNav = readFileSync('src/components/shell/navigation.tsx', 'utf8');
  const mobileBottomTabs = readFileSync('src/features/mobile/components/mobile-bottom-tabs.tsx', 'utf8');
  const mobileTabBar = readFileSync('src/components/shell/MobileTabBar.tsx', 'utf8');

  assert.match(sharedNav, /canonicalShellSections/);
  assert.match(sharedNav, /getCanonicalMobileNavItems/);
  assert.match(sharedNav, /mobileMoreNavItems/);
  assert.match(sharedNav, /href: '\/tasks'/);
  assert.match(sharedNav, /href: '\/trade-events'/);
  assert.match(shellNav, /filterShellSections/);
  assert.match(shellNav, /getPrimaryShellNavItems/);
  assert.match(mobileBottomTabs, /mobileMoreNavItems/);
  assert.match(mobileBottomTabs, /Tasks & Events/);
  assert.match(mobileBottomTabs, />More</);
  assert.match(mobileTabBar, /mobileMoreNavItems/);
  assert.match(mobileTabBar, />More</);
  assert.doesNotMatch(mobileTabBar, /const tabs = \[/);
});

test('mobile docs preserve signed-in identity and Share vCard without reference HTML handoff files', () => {
  const mobileDocs = readFileSync('docs/MOBILE.md', 'utf8');
  const productOverview = readFileSync('docs/PRODUCT_OVERVIEW.md', 'utf8');
  for (const source of [mobileDocs, productOverview]) {
    assert.match(source, /Share vCard/);
    assert.match(source, /signed-in|Signed-in|Signed in/);
  }
  assert.equal(existsSync('public/internal-dcc/index.html'), false);
  assert.equal(existsSync('public/setuflow-architecture.html'), false);
});
