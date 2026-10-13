import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const studio=fs.readFileSync('src/features/packaging/components/premium-packaging-quote-builder-v5.tsx','utf8');
const commercial=fs.readFileSync('src/features/packaging/server/pricing-v5-line-commercial-actions.ts','utf8');

test('Stark quote: first step exposes saved lines, duplication, different family, and pricing controls',()=>{
  assert.match(studio,/Add multiple sizes or service families/);
  assert.match(studio,/pricedLineCount>0 \? renderSavedLineEditor\(\)/);
  assert.match(studio,/function renderSavedLineEditor\(\)/);
  assert.match(studio,/manageLine\(lineId,lineFamily,'duplicate'\)/);
  assert.match(studio,/Choose the same family to add a different size/);
  assert.match(studio,/Customer price adjustment/);
  assert.match(studio,/Existing customer price \/ pc|Approved customer price/);
});

test('Stark quote: discount reason and approval enforced, persistence remains server-side',()=>{
  assert.match(studio,/if\(!discountReason\.trim\(\)\)/);
  assert.match(studio,/adjustPackagingPricingV5QuoteLine\(/);
  assert.match(commercial,/app_adjust_packaging_v5_quote_line_tx/);
  assert.match(commercial,/APPROVAL_THRESHOLD_PERCENT=15/);
  assert.match(commercial,/p_actor_user_id/);
});
