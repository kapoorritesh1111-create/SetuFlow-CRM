import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const policy = readFileSync('src/lib/setu-guru/guru-response-policy.ts', 'utf8');
const widget = readFileSync('src/features/setu-guru/setu-guru-widget.tsx', 'utf8');
const orgSearchRoute = readFileSync('src/app/api/setu-guru/org-search/route.ts', 'utf8');

test('Setu Guru routes exact order status prompt to live workflow retrieval', () => {
  assert.match(policy, /check this order status/);
  assert.match(policy, /check order status/);
  assert.match(policy, /order status/);
  assert.match(policy, /order state/);
  assert.match(policy, /order readiness/);
  assert.match(policy, /Use canonical order lifecycle state/);
  assert.match(policy, /Use live organization data before generic workflow guidance/);
  assert.match(widget, /if \(isSetuGuruOrgSearchQuestion\(question\)\)/);
  assert.match(widget, /runOrgSearch\(question\)/);
  assert.match(orgSearchRoute, /mode === 'workflow_status'/);
  assert.match(orgSearchRoute, /buildWorkflowStatusResponse/);
});
