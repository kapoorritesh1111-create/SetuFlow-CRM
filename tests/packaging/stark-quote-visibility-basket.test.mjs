import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const lead=fs.readFileSync('src/features/leads/canonical/StarkLeadDetailApproved.tsx','utf8');
const studio=fs.readFileSync('src/features/packaging/components/premium-packaging-quote-builder-v5.tsx','utf8');

test('Stark lead details show all linked quotes instead of only two',()=>{
 assert.doesNotMatch(lead,/quotes\.slice\(0,\s*2\)/);
 assert.match(lead,/\[\.\.\.quotes\]\.sort/);
 assert.match(lead,/count:quotes\.length/);
});
test('Step 2 keeps a live basket and contextual line controls in view',()=>{
 assert.match(studio,/aria-label="Live quote basket"/);
 assert.match(studio,/xl:sticky xl:top-4/);
 assert.match(studio,/intent\?\.lineId===id/);
 assert.match(studio,/manageLine\(id,family,'duplicate'\)/);
 assert.match(studio,/manageLine\(id,family,'edit'\)/);
 assert.match(studio,/openLinePriceEditor\(line\)/);
 assert.match(studio,/Priced items/);
 assert.match(studio,/additional draft or unpriced line/);
});
