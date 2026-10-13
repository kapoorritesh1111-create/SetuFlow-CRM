import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const studio=fs.readFileSync('src/features/packaging/components/premium-packaging-quote-builder-v5.tsx','utf8');
const commercial=fs.readFileSync('src/features/packaging/server/pricing-v5-line-commercial-actions.ts','utf8');

test('Step 1: multiple sizes, families, and line pricing controls are visible',()=>{
 assert.match(studio,/Add multiple sizes or service families/);
 assert.match(studio,/Another size \(duplicate\)/);
 assert.match(studio,/manageLine\(id,family,'duplicate'\)/);
 assert.match(studio,/openLinePriceEditor\(line\)/);
 assert.match(studio,/\+ Add another size or service family/);
 assert.match(studio,/Choose the same family for another size/);
});
test('Discount remains backed by existing approvals and persistence',()=>{
 assert.match(studio,/if\(!discountReason\.trim\(\)\)/);
 assert.match(studio,/customer_price/);
 assert.match(studio,/adjustPackagingPricingV5QuoteLine/);
 assert.match(commercial,/APPROVAL_THRESHOLD_PERCENT=15/);
 assert.match(commercial,/app_adjust_packaging_v5_quote_line_tx/);
});
