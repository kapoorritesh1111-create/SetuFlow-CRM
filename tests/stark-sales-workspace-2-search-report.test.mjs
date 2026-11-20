import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const search=fs.readFileSync('src/app/(app)/leads/customer-search/page.tsx','utf8');
const report=fs.readFileSync('src/app/(app)/leads/sales-activity/page.tsx','utf8');
const inbound=fs.readFileSync('src/app/(app)/leads/inbound/page.tsx','utf8');
test('customer lookup is scoped to Stark and preserves ownership',()=>{
 assert.match(search,/organization_id',STARK/);
 assert.match(search,/lead_assignment_history/);
 assert.match(search,/mayOpen/);
 assert.doesNotMatch(search,/.update\(/);
 assert.match(inbound,/Customer search/);
});
test('owner calls and meetings count actual events rather than stage labels',()=>{
 assert.match(report,/meeting_metadata/);
 assert.match(report,/meta.completed_at/);
 assert.match(report,/meta.completed_by/);
 assert.match(report,/inboundAttempted/);
 assert.match(report,/crmUnknown/);
 assert.match(report,/Asia\/Kolkata/);
 assert.match(report,/OWNER_ROLES/);
});

test('activity reporting separates CRM and inbound call context and checks duplicate logs',()=>{
 assert.match(report,/inboundContext/);
 assert.match(report,/duplicateInbound/);
 assert.match(report,/source_path/);
 assert.match(report,/Math.abs\(message.at-Date.parse\(event.created_at\)\)<=120000/);
 assert.match(report,/quoteLead.has\(event.quote_id\)/);
});
