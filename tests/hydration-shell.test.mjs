import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const desktopRedirect = readFileSync('src/components/shell/DesktopRedirect.tsx', 'utf8');
const appShell = readFileSync('src/components/layout/app-shell.tsx', 'utf8');
const onboardingPage = readFileSync('src/app/onboarding/page.tsx', 'utf8');
const adminOnboardingPage = readFileSync('src/app/(app)/admin/client-onboarding/page.tsx', 'utf8');

test('hydration baseline: desktop-only mobile redirect does not read window during first render', () => {
  assert.match(desktopRedirect, /useEffect\(\(\) => \{\s*setHref\(window\.location\.href\);\s*setHostname\(window\.location\.hostname\);/s);
  assert.doesNotMatch(desktopRedirect, /typeof window !== 'undefined' \? window\.location\.hostname/);
  assert.doesNotMatch(desktopRedirect, /useMemo\(\(\) => \(typeof window === 'undefined'/);
});

test('hydration baseline: admin desktop-only routes keep public onboarding form outside login wall', () => {
  assert.match(appShell, /const desktopOnlyRoutes = \['\/pipeline', '\/quotes', '\/products', '\/admin'/);
  assert.match(onboardingPage, /action="\/api\/public\/client-onboarding"/);
  assert.doesNotMatch(onboardingPage, /requireWorkspace|requireAdminWorkspace|AppShell/);
  assert.match(adminOnboardingPage, /requireAdminWorkspace/);
  assert.match(adminOnboardingPage, /Open client form/);
});
