import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifest = JSON.parse(readFileSync(new URL('../src/lib/routes/manifest.json', import.meta.url), 'utf8'));
const { requiredFiles, forbiddenPaths } = manifest.tests;
const primaryNav = manifest.primaryNav.map((item) => item.href);

test('canonical product routes and internal DCC exist', () => {
  requiredFiles.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
});

test('forbidden internal legacy surfaces are absent', () => {
  forbiddenPaths.forEach((path) => assert.equal(existsSync(path), false, `${path} should be absent`));
});

test('canonical manifest keeps pipeline in primary navigation', () => {
  assert.equal(primaryNav.includes('/pipeline'), true, 'pipeline should remain in primary navigation');
  assert.equal(primaryNav[2], '/pipeline', 'pipeline should stay visible near the core commercial routes');
});
