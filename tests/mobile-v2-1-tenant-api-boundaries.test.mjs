import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = (path) => readFileSync(new URL('../' + path, import.meta.url), 'utf8');

test('module server gate requires matching tenant membership before support override', () => {
  const gate = source('src/lib/modules/require-organization-module.ts');
  const membership = gate.indexOf('workspace.organization.id !== organizationId');
  const support = gate.indexOf('isVerifiedPlatformSupport(workspace.user.id)');
  assert.ok(membership !== -1 && support > membership);
  assert.match(gate, /data\?\.enabled !== true\) notFound\(\)/);
});

test('orders catalog service-role fallback remains tenant scoped and follows entitlement gate', () => {
  const api = source('src/app/api/orders/catalog-options/route.ts');
  const gate = api.indexOf("await requireOrganizationModule(orgId, 'orders_compliance')");
  const admin = api.indexOf('createAdminSupabaseClient()');
  assert.ok(gate !== -1 && admin > gate);
  assert.match(api, /\.eq\('organization_id', orgId\)/);
  assert.match(api, /sourcePrefix: 'verified_org_admin_fallback'/);
});

test('offline event capture requires licensed tenant and verifies event ownership before save', () => {
  const api = source('src/app/api/trade-events/offline-capture/route.ts');
  const gate = api.indexOf("await requireOrganizationModule(workspace.organization.id, 'trade_show')");
  const owner = api.indexOf(".eq('organization_id', workspace.organization.id)");
  const save = api.indexOf('await saveLead(undefined, formData)');
  assert.ok(gate !== -1 && owner > gate && save > owner);
});

test('module grants API never expands missing tenant grants for ordinary users', () => {
  const api = source('src/app/api/modules/grants/route.ts');
  assert.match(api, /error: 'workspace_unavailable'/);
  assert.match(api, /error: 'module_grants_unavailable'/);
  assert.match(api, /platformSupport \? MODULE_KEYS\.map/);
  assert.match(api, /canAccessAdmin: workspace\.canAccessAdmin \|\| platformSupport/);
});
