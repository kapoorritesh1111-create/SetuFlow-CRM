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
  assert.doesNotMatch(nextConfig, /source: '\/academy'[\s\S]*destination: '\/marketing\/guides\/setu_flow_packaging_workspace_guide\.html'/);
  assert.match(middleware, /host === 'packaging\.setuflowcrm\.com'/);
  assert.match(middleware, /pathname === '\/packaging-academy'/);
  assert.match(middleware, /'\/academy'/);
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
