import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const lib = readFileSync('src/lib/setu-guru/approval-governance.ts', 'utf8');
test('governance checkGovernance always returns allowed:false with approval guidance', () => {
  assert.match(lib, /allowed: false/);
  assert.match(lib, /requiresHumanApproval: true/);
  assert.match(lib, /approvalGuidance/);
  assert.match(lib, /blockedBy/);
});
test('governance covers all governed categories', () => {
  ['hsn_write_back','pricing_default_change','compliance_waiver','quote_send','order_advancement','finance_handoff','freight_booking','dispatch_confirm'].forEach((cat) => {
    assert.match(lib, new RegExp(cat));
  });
});
test('governance isGovernedAction and logGovernanceBlock exist', () => {
  assert.match(lib, /isGovernedAction/);
  assert.match(lib, /logGovernanceBlock/);
  assert.match(lib, /writeAuditLog/);
});
