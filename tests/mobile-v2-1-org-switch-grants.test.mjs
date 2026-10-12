import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/mobile/components/mobile-bottom-tabs.tsx', import.meta.url), 'utf8');

test('mobile module grants are reloaded when pathname changes after organization switching', () => {
  const start = source.indexOf('useEffect(() => {');
  const end = source.indexOf('const enabledModules', start);
  assert.ok(start > 0 && end > start);
  assert.match(source.slice(start, end), /\}, \[pathname\]\);/);
  assert.match(source.slice(start, end), /let active = true;\s*setGrants\(\[\]\);\s*setCanAccessAdmin\(false\);\s*fetch\('\/api\/modules\/grants'/);
});
