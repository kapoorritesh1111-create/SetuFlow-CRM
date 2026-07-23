import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const auditQuery = readFileSync('src/lib/setu-guru/audit-history.ts', 'utf8');
const auditPanel = readFileSync('src/features/setu-guru/audit-history-panel.tsx', 'utf8');
const growthPage = readFileSync('src/app/(app)/growth-agent/page.tsx', 'utf8');
const actionLayer = readFileSync('src/lib/setu-guru/action-layer.ts', 'utf8');
const outreachActivity = readFileSync('src/lib/setu-guru/outreach-activity.ts', 'utf8');

test('Setu Guru audit history is organization scoped across every source', () => {
  assert.match(auditQuery, /from\('ai_recommendations'\)[\s\S]*\.eq\('org_id', orgId\)/);
  assert.match(auditQuery, /from\('communications'\)[\s\S]*\.eq\('organization_id', orgId\)/);
  assert.match(auditQuery, /from\('audit_logs'\)[\s\S]*\.eq\('organization_id', orgId\)/);
  assert.doesNotMatch(auditQuery, /request\.json|searchParams/);
});

test('Audit history combines lifecycle, drafts, actors, linked entities and source context', () => {
  for (const field of ['dismiss_reason', 'completed_at', 'expired_at', 'created_by', 'approved_by', 'actor_user_id', 'entity_type', 'entity_id']) {
    assert.match(auditQuery, new RegExp(field));
  }
  assert.match(auditQuery, /Grounded facts:/);
  assert.match(auditQuery, /Action record is missing explicit human-approval evidence/);
  assert.match(auditPanel, /Setu Guru activity and approval audit/);
  assert.match(auditPanel, /item\.actor/);
  assert.match(auditPanel, /item\.source_context/);
  assert.match(growthPage, /getSetuGuruAuditHistory\(organizationId\)/);
});

test('Approved actions and AI drafts preserve human approval guardrails', () => {
  assert.match(actionLayer, /approved_by_human: true/);
  assert.match(actionLayer, /actorUserId/);
  assert.match(outreachActivity, /status: 'draft'/);
  assert.match(outreachActivity, /draft_source: 'ai'/);
  assert.doesNotMatch(outreachActivity, /status: 'sent'/);
});

test('Audit panel makes failed or missing approval evidence visible', () => {
  assert.match(auditPanel, /attention required/);
  assert.match(auditPanel, /AlertTriangle/);
  assert.match(auditPanel, /outcome/);
});
