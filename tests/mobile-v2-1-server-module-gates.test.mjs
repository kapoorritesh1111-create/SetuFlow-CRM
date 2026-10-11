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

test('orders catalog API enforces entitlement before reading catalog rows', () => {
  const source = read('src/app/api/orders/catalog-options/route.ts');
  assert.match(source, /await requireOrganizationModule\(orgId, 'orders_compliance'\)/);
});
test('offline trade show capture validates entitlement and event tenant', () => {
  const source = read('src/app/api/trade-events/offline-capture/route.ts');
  assert.match(source, /requireOrganizationModule\(workspace.organization.id, 'trade_show'\)/);
  assert.match(source, /eq\('organization_id', workspace.organization.id\)/);
});

for (const documentKind of ['invoice', 'order-confirmation']) {
  test(`orders ${documentKind} PDF enforces licensed server access`, () => {
    const source = read(`src/app/api/orders/[contractId]/${documentKind}/pdf/route.ts`);
    assert.match(source, /await requireOrganizationModule\(organizationId, 'orders_compliance'\)/);
  });
}
