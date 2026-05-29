import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const store = readFileSync('src/lib/setu-guru/feedback-store.ts', 'utf8');
const route = readFileSync('src/app/api/setu-guru/feedback/route.ts', 'utf8');
test('feedback store writes to setu_guru_feedback table with org isolation', () => {
  assert.match(store, /setu_guru_feedback/);
  assert.match(store, /organization_id/);
  assert.match(store, /writeFeedback/);
  assert.match(store, /getFeedbackSummary/);
});
test('feedback route writes to durable table AND audit_log fallback', () => {
  assert.match(route, /writeFeedback/);
  assert.match(route, /writeAuditLog/);
  assert.match(route, /table_write_ok/);
  assert.match(route, /persisted/);
});
test('feedback GET summary is admin-only', () => {
  assert.match(route, /admin.*required|currentRoles.*admin/s);
  assert.match(route, /status: 403/);
});
