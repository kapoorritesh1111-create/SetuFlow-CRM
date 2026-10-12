import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../src/features/mobile/components/mobile-bottom-tabs.tsx', import.meta.url), 'utf8');

test('mobile module grants refresh on route changes, focus and visibility', () => {
  const start = source.indexOf('useEffect(() => {');
  const end = source.indexOf('const enabledModules', start);
  assert.ok(start > 0 && end > start);
  const effect = source.slice(start, end);
  assert.match(effect, /\}, \[pathname\]\);/);
  assert.match(effect, /const refreshGrants = \(\) =>/);
  assert.match(effect, /setGrants\(\[\]\);\s*setCanAccessAdmin\(false\);\s*fetch\('\/api\/modules\/grants'/);
  assert.match(effect, /window\.addEventListener\('focus', refreshGrants\)/);
  assert.match(effect, /document\.addEventListener\('visibilitychange', refreshWhenVisible\)/);
  assert.match(effect, /window\.removeEventListener\('focus', refreshGrants\)/);
  assert.match(effect, /document\.removeEventListener\('visibilitychange', refreshWhenVisible\)/);
});

test('outdated permission requests cannot restore previous tenant navigation', () => {
  const effect = source.slice(source.indexOf('useEffect(() => {'), source.indexOf('const enabledModules'));
  assert.match(effect, /const version = \+\+requestVersion/);
  assert.equal((effect.match(/active && version === requestVersion/g) ?? []).length, 2);
});
