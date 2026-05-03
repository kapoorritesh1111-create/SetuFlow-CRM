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
  assert.match(leadsPage, /RoleAwareLeadList/);
  assert.match(leadsPage, /buildMobileLeadCardsFromAppData/);
  assert.match(leadsPage, /buildMobileSignedInSummary/);
  assert.match(leadsPage, /md:hidden/);
  assert.match(leadsPage, /hidden space-y-4 md:block/);
  assert.match(leadsPage, /LeadsWorkspace/);
});

test('mobile docs and html preserve signed-in identity and Share vCard', () => {
  const readme = readFileSync('MOBILE_README.md', 'utf8');
  const dcc = readFileSync('public/internal-dcc/index.html', 'utf8');
  const architecture = readFileSync('public/setuflow-architecture.html', 'utf8');
  const blueprint = readFileSync('public/internal-dcc/mobile-blueprint.html', 'utf8');
  for (const source of [readme, dcc, architecture, blueprint]) {
    assert.match(source, /Share vCard/);
    assert.match(source, /signed-in|Signed-in|Signed in/);
  }
});
