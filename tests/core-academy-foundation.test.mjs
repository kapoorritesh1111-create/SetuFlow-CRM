import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Core Academy uses isolated public route, API, progress storage, and screenshot folder', async () => {
  const [page, aliasPage, client, screenshot, screenshotReadme, api, content, migration, nextConfig, middleware] = await Promise.all([
    read('src/app/academy/page.tsx'),
    read('src/app/core-academy/page.tsx'),
    read('src/features/academy/core-academy-client.tsx'),
    read('src/features/academy/core-academy-screenshot.tsx'),
    read('public/academy/core/screenshots/README.md'),
    read('src/app/api/core-academy/progress/route.ts'),
    read('src/features/academy/core-academy-content.ts'),
    read('supabase/migrations/20260729053000_core_academy_progress_isolation.sql'),
    read('next.config.mjs'),
    read('middleware.ts'),
  ]);

  assert.match(page, /core_academy_progress/);
  assert.match(page, /isAuthenticated/);
  assert.match(aliasPage, /redirect\('\/academy'\)/);
  assert.match(client, /Sign in to sync/);
  assert.match(client, /item\.startRoute \|\| item\.route/);
  assert.match(client, /CoreAcademyScreenshot/);
  assert.match(client, /Test Center/);
  assert.match(client, /Pass|pass/);
  assert.doesNotMatch(client, /replace\('\[buyerLeadId\]'/);
  assert.match(screenshot, /CORE_ACADEMY_SCREENSHOT_BASE_PATH = '\/academy\/core\/screenshots'/);
  assert.match(screenshot, /onError=\{\(\) => setIsMissing\(true\)\}/);
  assert.match(screenshot, /public\/academy\/core\/screenshots\//);
  assert.match(screenshotReadme, /ACADEMY-001-global-navigation\.png/);
  assert.match(api, /core_academy_progress/);
  assert.match(content, /ACADEMY-001-global-navigation\.png/);
  assert.match(content, /ACADEMY-049-my-card-share\.png/);
  assert.match(content, /instructions: string\[\]/);
  assert.match(content, /'\/growth-agent'/);
  assert.match(content, /'\/contact-exchange\/vcard'/);
  assert.match(content, /'\/price-lists'/);
  assert.match(content, /'\/documents'/);
  assert.match(migration, /create table if not exists public\.core_academy_progress/);
  assert.doesNotMatch(migration, /alter table public\.packaging_/);
  assert.match(nextConfig, /type: 'host'/);
  assert.match(nextConfig, /packaging\\\.setuflowcrm\\\.com/);
  assert.match(nextConfig, /destination: '\/guides\/setu_flow_packaging_workspace_guide\.html'/);
  assert.match(middleware, /PACKAGING_ACADEMY_HOST = 'packaging\.setuflowcrm\.com'/);
  assert.match(middleware, /requestHostCandidates/);
  assert.match(middleware, /isPackagingAcademyHost/);
  assert.match(middleware, /X-Setu-Academy', 'packaging'/);
  assert.match(middleware, /X-Setu-Academy', 'core'/);
  assert.match(middleware, /pathname === '\/packaging-academy'/);
});

test('Packaging and Core Academy remain separate by hostname', async () => {
  const [nextConfig, middleware] = await Promise.all([
    read('next.config.mjs'),
    read('middleware.ts'),
  ]);

  assert.match(nextConfig, /source: '\/academy'[\s\S]*type: 'host'[\s\S]*packaging\\\.setuflowcrm\\\.com[\s\S]*destination: '\/guides\/setu_flow_packaging_workspace_guide\.html'/);
  assert.match(middleware, /if \(pathname === '\/academy' && packagingHost\)/);
  assert.match(middleware, /NextResponse\.rewrite\(new URL\(PACKAGING_ACADEMY_PATH, request\.url\)/);
  assert.match(middleware, /if \(pathname === '\/academy' \|\| pathname === '\/core-academy'\)/);
  assert.match(middleware, /NextResponse\.next\(\{ request: \{ headers: requestHeaders \} \}\)/);
  assert.match(middleware, /https:\/\/packaging\.setuflowcrm\.com\/academy/);
  assert.match(middleware, /https:\/\/www\.setuflowcrm\.com\/academy/);
});

test('Academy routes use real entry points and preserve safe starts for dynamic records', async () => {
  const [content, growthCompatibility] = await Promise.all([
    read('src/features/academy/core-academy-content.ts'),
    read('src/app/(app)/growth-center/page.tsx'),
  ]);

  assert.doesNotMatch(content, /step\([^\n]+title[^\n]+, '\/growth-center'/);
  assert.match(content, /startRoute: '\/leads\?mode=buyers'/);
  assert.match(content, /startRoute: '\/leads\?mode=suppliers'/);
  assert.match(growthCompatibility, /redirect\('\/growth-agent'\)/);
});

test('Fail and Blocked tests use the shared issue log workflow', async () => {
  const [page, logger, api, migration] = await Promise.all([
    read('src/app/academy/page.tsx'),
    read('src/features/academy/core-academy-issue-logger.tsx'),
    read('src/app/api/core-academy/tests/route.ts'),
    read('supabase/migrations/20260729172000_core_academy_test_results_and_issue_logging.sql'),
  ]);

  assert.match(page, /CoreAcademyIssueLogger/);
  assert.match(logger, /label !== 'Fail' && label !== 'Blocked'/);
  assert.match(logger, /Screenshot evidence/);
  assert.match(logger, /api\/core-academy\/tests/);
  assert.match(api, /ACADEMY_REPORTER_NAME = 'Test User'/);
  assert.match(api, /ACADEMY_REPORTER_EMAIL = 'test@test\.com'/);
  assert.match(api, /ISSUE_PREFIX = 'S51-ACA-'/);
  assert.match(api, /Screenshot evidence is required/);
  assert.match(api, /from\('sprint_issues'\)\.insert/);
  assert.match(api, /submitted_via: 'Core Academy'/);
  assert.match(api, /linked_issue_ref/);
  assert.match(migration, /create table if not exists public\.core_academy_test_runs/);
  assert.match(migration, /create table if not exists public\.core_academy_test_results/);
  assert.match(migration, /core-academy-test-evidence/);
  assert.doesNotMatch(migration, /alter table public\.packaging_/);
});

test('Pass completes the journey, screenshots zoom, and owners receive an organization report', async () => {
  const [page, passLogger, screenshot, testsApi, reportApi, reportPanel] = await Promise.all([
    read('src/app/academy/page.tsx'),
    read('src/features/academy/core-academy-pass-logger.tsx'),
    read('src/features/academy/core-academy-screenshot.tsx'),
    read('src/app/api/core-academy/tests/route.ts'),
    read('src/app/api/core-academy/report/route.ts'),
    read('src/features/academy/core-academy-admin-report.tsx'),
  ]);

  assert.match(page, /CoreAcademyPassLogger/);
  assert.match(page, /CoreAcademyAdminReport/);
  assert.match(page, /workspace\.canAccessAdmin/);
  assert.match(passLogger, /textContent\?\.trim\(\) !== 'Pass'/);
  assert.match(passLogger, /completionButton\.click\(\)/);
  assert.match(passLogger, /step is complete in both My Journey and Test Center/);
  assert.match(testsApi, /ALLOWED_RESULTS = new Set\(\['Pass', 'Fail', 'Blocked', 'N\/A'\]\)/);
  assert.match(testsApi, /if \(result === 'Pass'\)/);
  assert.match(testsApi, /from\('core_academy_progress'\)\.upsert/);
  assert.match(screenshot, /Zoom screenshot/);
  assert.match(screenshot, /setZoom/);
  assert.match(screenshot, /role="dialog"/);
  assert.match(reportApi, /workspace\.canAccessAdmin/);
  assert.match(reportApi, /submitted_via', 'Core Academy'/);
  assert.match(reportApi, /activeLearners/);
  assert.match(reportApi, /inProgress/);
  assert.match(reportApi, /resolved/);
  assert.match(reportPanel, /Academy Report/);
  assert.match(reportPanel, /Owners & admins/);
  assert.match(reportPanel, /Who has learned and tested/);
});
