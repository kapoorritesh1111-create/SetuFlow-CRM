import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

const migration = read('supabase/migrations/20260630172000_s41_supplier_pipeline_hardening.sql');
const shell = read('src/features/pipeline/components/PipelineBoardViewShell.tsx');

test('S41 supplier pipeline migration installs a buyer/supplier journey guard', () => {
  assert.match(migration, /create or replace function public\.setuflow_enforce_lead_pipeline_journey\(\)/);
  assert.match(migration, /create trigger setuflow_enforce_lead_pipeline_journey/);
  assert.match(migration, /pipeline_journey not in \(new\.lead_type, 'both'\)/);
  assert.match(migration, /Selected pipeline is not configured for % lead workflow/);
  assert.match(migration, /Selected stage does not belong to the selected pipeline/);
});

test('S41 supplier pipeline migration seeds canonical supplier journey stages', () => {
  assert.match(migration, /Supplier Journey Pipeline/);
  assert.match(migration, /'New Supplier'/);
  assert.match(migration, /'Profile Review'/);
  assert.match(migration, /'Capability Mapped'/);
  assert.match(migration, /'Documents Requested'/);
  assert.match(migration, /'Compliance Review'/);
  assert.match(migration, /'Cost \/ Sample Requested'/);
  assert.match(migration, /'Response Received'/);
  assert.match(migration, /'Approved Supplier', 80, '#16a34a', true, true, false/);
  assert.match(migration, /'Rejected Supplier', 90, '#ef4444', true, false, true/);
  assert.match(migration, /'Inactive Supplier', 100, '#64748b', true, false, true/);
});

test('S41 supplier pipeline migration clears old supplier defaults before promoting canonical default', () => {
  assert.match(migration, /'Supplier Journey Pipeline', 'supplier', false/);
  assert.match(migration, /set is_default = false[\s\S]*lower\(p\.lead_type\) = 'supplier'[\s\S]*p\.is_default = true/);
  assert.match(migration, /set is_default = true[\s\S]*lower\(name\) = 'supplier journey pipeline'/);
  assert.doesNotMatch(migration, /'Supplier Journey Pipeline', 'supplier', true/);
  assert.doesNotMatch(migration, /set is_default = \(p\.id = c\.id\)/);
});

test('S41 supplier pipeline migration repairs legacy stage-derived pipeline mismatches', () => {
  assert.match(migration, /Repair legacy records that have a stage but no matching pipeline/);
  assert.match(migration, /update public\.leads l/);
  assert.match(migration, /l\.pipeline_id is distinct from ps\.pipeline_id/);
  assert.match(migration, /lower\(p\.lead_type\) in \(lower\(l\.lead_type\), 'both'\)/);
});

test('S41 pipeline shell passes mode-scoped Kanban props', () => {
  assert.match(shell, /const activeWorkspaceMode = activeLeadType === 'supplier' \? 'suppliers'/);
  assert.match(shell, /const filteredStages = useMemo/);
  assert.match(shell, /const filteredPipelines = useMemo/);
  assert.match(shell, /const scopedKanbanProps = useMemo<PipelineBoardProps>/);
  assert.match(shell, /<PipelineBoard \{\.\.\.scopedKanbanProps\} \/>/);
  assert.doesNotMatch(shell, /<PipelineBoard \{\.\.\.props\} \/>/);
});
