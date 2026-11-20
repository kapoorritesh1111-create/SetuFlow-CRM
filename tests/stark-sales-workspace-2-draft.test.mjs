import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const call=fs.readFileSync('src/features/integrations/interakt/review-actions.ts','utf8');
const panel=fs.readFileSync('src/features/sales-meetings/StarkMeetingPanel.tsx','utf8');
test('inbound call recording checks assignment and defines connected separately from attempts',()=>{
 const action=call.slice(call.indexOf('export async function logStarkInteraktCall('),call.indexOf('async function requireOwnedInboundRow'));
 assert.match(action,/requireOwnedInboundRow\(db, organization\.id, user\.id, workspace, rowId\)/);
 assert.match(action,/is_connected: disposition === 'Connected'/);
 assert.match(action,/allowedDispositions/);
});
test('meeting completion opens outcome form instead of immediate completion',()=>{
 assert.match(panel,/Meeting Done · Record outcome/);
 assert.match(panel,/editingAction==='completed'/);
 assert.match(panel,/completionOutcome/);
});
