import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Core Academy uses isolated public route, API, and progress storage', async () => {
  const [page, aliasPage, client, api, content, migration, nextConfig, middleware] = await Promise.all([
    read('src/app/academy/page.tsx'),
    read('src/app/core-academy/page.tsx'),
    read('src/features/academy/core-academy-client.tsx'),
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
  assert.match(client, /step\.startRoute \|\| step\.route/);
  assert.doesNotMatch(client, /replace\('\[buyerLeadId\]'/);
  assert.match(api, /core_academy_progress/);
  assert.match(content, /ACADEMY-001-global-navigation\.png/);
  assert.match(content, /ACADEMY-044-setu-guru-supplier-event-tools\.png/);
  assert.match(content, /startRoute: '\/leads\?mode=buyers'/);
  assert.match(migration, /create table if not exists public\.core_academy_progress/);
  assert.doesNotMatch(migration, /alter table public\.packaging_/);
  assert.doesNotMatch(nextConfig, /source: '\/academy'[\s\S]*destination: '\/marketing\/guides\/setu_flow_packaging_workspace_guide\.html'/);
  assert.match(middleware, /host === 'packaging\.setuflowcrm\.com'/);
  assert.match(middleware, /pathname === '\/packaging-academy'/);
  assert.match(middleware, /'\/academy'/);
});

test('Academy clickable routes contain no unresolved record placeholders', async () => {
  const content = await read('src/features/academy/core-academy-content.ts');
  const dynamicRoutes = [...content.matchAll(/route: '([^']*\[[^']+)'(?:, startRoute: '([^']+)')?/g)];
  assert.ok(dynamicRoutes.length > 0);
  for (const [, route, startRoute] of dynamicRoutes) {
    assert.ok(startRoute, `Dynamic teaching route ${route} must define a safe startRoute`);
    assert.doesNotMatch(startRoute, /\[[^\]]+\]/);
    assert.doesNotMatch(startRoute, /\/\//);
  }
});
