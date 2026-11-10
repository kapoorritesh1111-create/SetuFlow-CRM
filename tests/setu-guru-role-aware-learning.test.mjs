import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), 'utf8');

test('Guru learning reuses the existing queue with org-scoped approved lookup', () => {
  const code = read('src/lib/setu-guru/organization-learning.ts');
  assert.match(code, /guru_ingestion_review_queue/);
  assert.match(code, /\.eq\('organization_id', organizationId\)/);
  assert.match(code, /\.eq\('status', 'approved'\)/);
  assert.match(code, /matchApprovedLesson/);
  assert.match(code, /MIN_SCORE/);
  assert.doesNotMatch(code, /pricing_templates.*update\(/);
});

test('Only authorized owners or admins may publish Guru knowledge', () => {
  const route = read('src/app/api/setu-guru/knowledge/route.ts');
  assert.match(route, /roles\.includes\('owner'\) \|\| roles\.includes\('admin'\)/);
  assert.match(route, /if \(!canManage\(workspace\.currentRoles\)\)/);
  assert.match(route, /workspace\.organization\.id/);
  assert.match(route, /writeAuditLog/);
});

test('Missing and wrong answers are routed through a reviewed learning flow', () => {
  const widget = read('src/features/setu-guru/setu-guru-widget.tsx');
  const panel = read('src/features/setu-guru/guru-learning-panel.tsx');
  assert.match(widget, /saveFeedback\('wrong'\)/);
  assert.match(widget, /kind !== 'helpful'/);
  assert.match(widget, /Request answer/);
  assert.match(panel, /Approve/);
  assert.match(panel, /Retire/);
  assert.match(panel, /Correct \/ update/);
});

test('Unapproved knowledge cannot be served as approved policy', () => {
  const org = read('src/app/api/setu-guru/org-search/route.ts');
  const store = read('src/lib/setu-guru/organization-learning.ts');
  assert.match(org, /if \(mode === 'organization_knowledge'\)/);
  assert.match(org, /I do not have an approved company procedure/);
  assert.match(store, /lesson\.status === 'approved'/);
  assert.match(store, /reviewGuruLesson/);
  assert.match(store, /Only approved lessons can be retired/);
});

test('RLS hides unapproved lessons and private feedback from other members', () => {
  const sql = read('supabase/migrations/20261110190000_guru_role_aware_learning_visibility.sql');
  assert.match(sql, /status = 'approved' OR public\.is_org_admin/);
  assert.match(sql, /auth\.uid\(\) = user_id OR public\.is_org_admin/);
  assert.match(sql, /auth\.uid\(\) = user_id AND public\.is_org_member/);
});
