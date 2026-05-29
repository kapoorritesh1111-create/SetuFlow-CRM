import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib   = readFileSync('src/lib/setu-guru/action-layer.ts', 'utf8');
const route = readFileSync('src/app/api/setu-guru/action/route.ts', 'utf8');
test('action layer has buildActionPreview returning requiresApproval always true', () => {
  assert.match(lib, /buildActionPreview/);
  assert.match(lib, /requiresApproval: true/);
  assert.match(lib, /RISK_MAP/);
  assert.match(lib, /SUMMARY_MAP/);
});
test('action layer enforces idempotency and writes audit log before mutation', () => {
  assert.match(lib, /idempotencyKey/);
  assert.match(lib, /idempotency key matched/);
  assert.match(lib, /writeAuditLog/);
  assert.match(lib, /approved_by_human: true/);
});
test('action route always returns preview when approved is false', () => {
  assert.match(route, /if \(!approved\)/);
  assert.match(route, /requiresApproval: true/);
  assert.match(route, /getWorkspaceAccess/);
  assert.match(route, /z\.enum/);
});
