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
  assert.match(appShell, /canonicalMobileRoutes = \['\/dashboard', '\/leads', '\/quotes', '\/orders'/);
  assert.match(appShell, /<MobileShell signedIn=\{signedInForMobile\} organizationId=\{organization\?\.id \?\? ''\} canonical>/);
  assert.match(appShell, /hidden md:block/);
  assert.match(dashboardPage, /MobileDashboardHome/);
  assert.match(dashboardPage, /<div className="md:hidden">/);
  assert.match(mobileShell, /data-mobile-shell=\{canonical \? 'canonical' : 'standalone'\}/);
  assert.match(mobileShell, /MobileBottomTabs/);
  const bottomTabs = readFileSync('src/features/mobile/components/mobile-bottom-tabs.tsx', 'utf8');
  assert.match(bottomTabs, /canonicalMobileNavItems/);
  assert.match(bottomTabs, /standaloneMobileNavItems/);
  assert.doesNotMatch(mobileNav, /export function MobileBottomTabs/);
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
  assert.match(sharedNav, /href:'\/tasks'/);
  assert.match(sharedNav, /href:'\/trade-events'/);
  assert.match(shellNav, /filterShellSections/);
  assert.match(shellNav, /getPrimaryShellNavItems/);
  assert.match(mobileBottomTabs, /mobileMoreNavItems/);
  assert.match(mobileBottomTabs, /mobileMoreNavItems/);
  assert.match(mobileBottomTabs, /\bMore\b/);
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

test('Mobile 3.0 is the phone landing page while desktop and specialist flows stay intact', () => {
  const dashboard = readFileSync('src/app/(app)/dashboard/page.tsx', 'utf8');
  const nav = readFileSync('src/lib/navigation/nav-items.ts', 'utf8');
  const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
  const sw = readFileSync('public/sw.js', 'utf8');
  assert.match(dashboard, /isMobileAppV1Enabled\(\)/);
  assert.match(dashboard, /\/iPhone\|iPod\|Android\|Mobile\/i\.test\(userAgent\)/);
  assert.match(dashboard, /redirect\('\/mobile'\)/);
  assert.match(dashboard, /if \(!explicitAll && workspace\.membership && workspace\.organization\)/);
  assert.match(dashboard, /!searchParams\?\.notice/);
  assert.match(dashboard, /primaryRole === 'design' \|\| primaryRole === 'operations'/);
  assert.match(nav, /mobileHref:'\/mobile',mobileLabel:'Home'/);
  assert.match(nav, /href:'\/mobile',label:'Home'/);
  assert.equal(manifest.start_url, '/mobile?source=pwa');
  assert.equal(manifest.id, '/dashboard', 'keep PWA installation identity stable');
  assert.match(sw, /const DEFAULT_NOTIFICATION_URL = '\/mobile\/notifications'/);
  assert.match(sw, /setuflow-offline-v7-mobile-3/);
});
