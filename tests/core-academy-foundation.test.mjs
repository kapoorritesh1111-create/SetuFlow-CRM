import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('Core Academy uses isolated route, API, and progress storage', async () => {
  const [page, api, content, migration, nextConfig] = await Promise.all([
    read('src/app/core-academy/page.tsx'),
    read('src/app/api/core-academy/progress/route.ts'),
    read('src/features/academy/core-academy-content.ts'),
    read('supabase/migrations/20260729053000_core_academy_progress_isolation.sql'),
    read('next.config.mjs'),
  ]);

  assert.match(page, /core_academy_progress/);
  assert.match(api, /core_academy_progress/);
  assert.match(content, /ACADEMY-001-global-navigation\.png/);
  assert.match(content, /ACADEMY-044-setu-guru-supplier-event-tools\.png/);
  assert.match(migration, /create table if not exists public\.core_academy_progress/);
  assert.doesNotMatch(migration, /alter table public\.packaging_/);
  assert.match(nextConfig, /destination: '\/marketing\/guides\/setu_flow_packaging_workspace_guide\.html'/);
});
