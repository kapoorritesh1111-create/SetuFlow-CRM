import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const provider = readFileSync('src/features/mobile/components/mobile-permissions.tsx', 'utf8');
const shell = readFileSync('src/features/mobile/components/mobile-shell.tsx', 'utf8');
const tabs = readFileSync('src/features/mobile/components/mobile-bottom-tabs.tsx', 'utf8');
const topBar = readFileSync('src/features/mobile/components/mobile-navigation.tsx', 'utf8');
const home = readFileSync('src/app/(mobile)/mobile/page.tsx', 'utf8');
const grantsApi = readFileSync('src/app/api/modules/grants/route.ts', 'utf8');

test('mobile shell owns one organization-keyed permissions provider', () => {
  assert.match(shell, /<MobilePermissionsProvider key=\{organizationId\} organizationId=\{organizationId\}>/);
  assert.match(shell, /organizationId: string/);
  assert.match(shell, /<MobileBottomTabs canonical=\{canonical\}/);
  assert.match(shell, /<BrandedMobileTopBar signedIn=\{signedIn\}/);
});

test('mobile navigation, top bar and home use the same permission state', () => {
  assert.match(tabs, /useMobilePermissions\(\)/);
  assert.match(topBar, /useMobilePermissions\(\)/);
  assert.match(home, /useMobilePermissions\(\)/);
  assert.doesNotMatch(tabs, /fetch\('\/api\/modules\/grants'/);
  assert.doesNotMatch(topBar, /fetch\('\/api\/modules\/grants'/);
  assert.doesNotMatch(home, /fetch\('\/api\/modules\/grants'/);
});

test('entitlements match server resolved organization, with abortable requests', () => {
  assert.match(grantsApi, /organizationId: workspace\.organization\.id/);
  assert.match(provider, /payload\.organizationId !== organizationId/);
  assert.match(provider, /controller\.abort\(\)/);
  assert.match(shell, /key=\{organizationId\}/);
});

test('temporary mobile offline failures retain last verified grants without unlicensed escalation', () => {
  assert.match(provider, /setError\(true\)/);
  assert.match(provider, /setGrants\(payload\.grants\)/);
  assert.match(provider, /setCanAccessAdmin\(payload\.canAccessAdmin === true\)/);
  assert.doesNotMatch(provider, /\.catch\(\(\) => \{[\s\S]{0,110}setGrants\(\[\]\)/);
  assert.match(shell, /Workspace connection interrupted/);
  assert.match(shell, /onClick=\{refresh\}/);
});

test('focus and foreground resync with cleanup', () => {
  assert.match(provider, /window\.addEventListener\('focus', refresh\)/);
  assert.match(provider, /document\.addEventListener\('visibilitychange', whenVisible\)/);
  assert.match(provider, /window\.removeEventListener\('focus', refresh\)/);
  assert.match(provider, /document\.removeEventListener\('visibilitychange', whenVisible\)/);
});

test('theme choice provides minimum 44px touch targets', () => {
  const theme = readFileSync('src/features/mobile/components/theme-toggle.tsx', 'utf8');
  assert.match(theme, /min-h-11 rounded-/);
});
