import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';

const requiredRoutes = [
  'src/app/(app)/orders/page.tsx',
  'src/app/(app)/dashboard/page.tsx',
  'src/app/(app)/contact-exchange/vcard/page.tsx',
  'src/app/(app)/contact-exchange/scan/page.tsx',
  'src/app/page.tsx',
];

test('canonical buyer-facing routes exist', () => {
  requiredRoutes.forEach((route) => assert.equal(existsSync(route), true, `${route} should exist`));
  assert.equal(existsSync('src/app/development'), false);
  assert.equal(existsSync('src/app/workspace'), false);
  assert.equal(existsSync('src/components/previews'), false);
});
