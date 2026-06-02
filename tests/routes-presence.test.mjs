import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/lib/routes/manifest.json', import.meta.url), 'utf8'));
const { requiredFiles, forbiddenPaths } = manifest.tests;
const primaryNav = manifest.primaryNav.map((item) => item.href);
const leadershipSection = manifest.shellSections.find((section) => section.id === 'leadership-watchtower');
const leadershipNav = leadershipSection.items.map((item) => item.href);

test('canonical product routes and cleanup docs exist', () => {
  requiredFiles.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
});

test('forbidden internal legacy surfaces are absent', () => {
  forbiddenPaths.forEach((path) => assert.equal(existsSync(path), false, `${path} should be absent`));
});

test('canonical manifest keeps the operator path visible in primary navigation', () => {
  assert.deepEqual(primaryNav.slice(0, 6), [
    '/contact-exchange/scan',
    '/leads',
    '/quotes',
    '/approval-send',
    '/orders',
    '/pipeline',
  ]);
  assert.equal(primaryNav.includes('/products'), true, 'catalog should remain in primary navigation');
  assert.equal(primaryNav.includes('/settings/lists'), true, 'settings should remain in primary navigation');
  assert.equal(primaryNav.includes('/reports'), true, 'reports should remain in primary navigation');
  assert.equal(primaryNav.at(-1), '/dashboard', 'overview should be present but demoted to the end');
});

test('reports route stays registered in the leadership shell section', () => {
  assert.equal(manifest.routes.app.reports, '/reports');
  assert.equal(requiredFiles.includes('src/app/(app)/reports/page.tsx'), true, 'reports page should be a required route file');
  assert.equal(leadershipNav.includes('/reports'), true, 'reports should stay visible in leadership shell navigation');
});
