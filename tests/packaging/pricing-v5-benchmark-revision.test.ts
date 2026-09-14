import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration=fs.readFileSync('supabase/migrations/20260914013610_s52_pkg_v5_benchmark_revision_scope.sql','utf8');
const actions=fs.readFileSync('src/features/packaging/server/pricing-v5-matrix-actions.ts','utf8');
const page=fs.readFileSync('src/app/(app)/admin/packaging-pricing-v5/matrix/page.tsx','utf8');
const matrix=fs.readFileSync('src/features/packaging/components/pricing-v5-price-matrix.tsx','utf8');

test('S52-PKG-V5: competitor benchmarks belong to an immutable template revision',()=>{
  assert.match(migration,/add column if not exists template_id uuid/i);
  assert.match(migration,/alter column template_id set not null/i);
  assert.match(migration,/guard_packaging_v5_benchmark_revision/);
  assert.match(migration,/s\.template_id=new\.template_id/);
  assert.match(migration,/c\.template_id=new\.template_id/);
});

test('S52-PKG-V5: benchmark server actions validate and persist template revision',()=>{
  assert.match(actions,/const templateId=text\(formData,'template_id'\)/);
  assert.match(actions,/template_id:templateId/);
  assert.match(actions,/loadPricingContextV5\(organization\.id,templateId\)/);
  assert.match(actions,/does not belong to the selected template revision/);
  assert.match(actions,/\.eq\('template_id',templateId\)/);
});

test('S52-PKG-V5: matrix reads and submits benchmarks only for the current revision',()=>{
  assert.match(page,/\.eq\('template_id',template\.id\)/);
  assert.match(matrix,/name="template_id" value=\{template\.id\}/);
  assert.match(matrix,/later revisions do not inherit stale comparisons/);
});
