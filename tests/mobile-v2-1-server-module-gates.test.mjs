import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');

test('module server gate fails closed unless a true grant exists', () => {
  const source = read('src/lib/modules/require-organization-module.ts');
  assert.match(source, /org_module_grants/);
  assert.match(source, /data\?\.enabled !== true/);
  assert.match(source, /notFound\(\)/);
});
test('Orders server layout enforces licensed access before querying orders', () => {
  const source = read('src/app/(app)/orders/layout.tsx');
  const gate = source.indexOf("await requireOrganizationModule(workspace.organization.id, 'orders_compliance')");
  assert.ok(gate > 0);
  assert.ok(gate < source.indexOf("const db = (await createClient())"));
});
test('Mail server page enforces licensed access before mounting mail app', () => {
  const source = read('src/app/(app)/mail/page.tsx');
  assert.match(source, /await requireOrganizationModule\(workspace\.organization\.id, 'setu_mail'\)/);
});
