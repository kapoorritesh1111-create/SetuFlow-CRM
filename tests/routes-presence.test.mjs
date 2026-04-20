import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const requiredRoutes = [
  'src/app/(app)/dashboard/page.tsx',
  'src/app/(app)/leads/page.tsx',
  'src/app/(app)/pipeline/page.tsx',
  'src/app/(app)/quotes/page.tsx',
  'src/app/(app)/orders/page.tsx',
  'src/app/(app)/contact-exchange/vcard/page.tsx',
  'src/app/(app)/contact-exchange/scan/page.tsx',
  'public/internal-dcc/index.html',
  'src/app/page.tsx',
];

const forbiddenPaths = [
  'src/app/development',
  'src/app/workspace',
  'src/components/previews',
  'src/components/planning',
];

test('canonical product routes and internal DCC exist', () => {
  requiredRoutes.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
});

test('forbidden internal legacy surfaces are absent', () => {
  forbiddenPaths.forEach((path) => assert.equal(existsSync(path), false, `${path} should be absent`));
});
