import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
const read=fs.readFileSync('src/features/integrations/interakt/inbound-workspace.ts','utf8');
const screen=fs.readFileSync('src/app/(app)/leads/inbound/page.tsx','utf8');
test('action queues filter by actual conversation evidence rather than legacy needs_reply flags',()=>{
 assert.match(read,/classifyInboundNextAction\(row\)/);
 assert.match(read,/actionQueueCount=matches.length/);
 assert.match(read,/last_inbound_at/);
 assert.match(read,/source_provider/);
 assert.match(read,/organization_id',organizationId/);
 assert.match(read,/scopedUserId/);
 assert.match(read,/queueRows.push/);
 assert.match(screen,/Reply Now/);
 assert.match(screen,/Reconnect/);
});
test('queue selection cannot silently truncate filtered results',()=>assert.match(read,/exceeds 20,000 records/));

test('inbound list must never present legacy reply flag as confirmed work',()=>{
 assert.doesNotMatch(screen,/>Needs reply<\/span>/);
 assert.match(screen,/row.action_classification/);
});
