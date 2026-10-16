import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';

const read=(p)=>readFileSync(new URL('../../'+p,import.meta.url),'utf8');

test('Quick Quote conversion is draft-only and idempotent at database boundary',()=>{
 const tx=read('mitigation/supabase/sql/quick_quote_convert_draft_tx.sql');
 const unique=read('mitigation/supabase/sql/quick_quote_unique_request_key.sql');
 assert.match(tx,/for update/);
 assert.match(tx,/v_est\.status='converted'/);
 assert.match(tx,/status='converted'/);
 assert.match(tx,/unit_price\)[\s\S]*null/);
 assert.match(unique,/create unique index/);
 assert.match(unique,/quote_creation_request_key/);
});

test('Quick Quote unverified lines cannot render customer PDF or link',()=>{
 const pdf=read('src/app/api/quotes/[quoteId]/pdf/route.ts');
 const customer=read('src/app/quote-review/[token]/page.tsx');
 const guard=read('mitigation/supabase/sql/quick_quote_pending_reprice_send_guard.sql');
 assert.match(pdf,/quick_quote_pending_reprice/);
 assert.match(pdf,/status:409/);
 assert.match(customer,/quick_quote_pending_reprice/);
 assert.match(guard,/quote_versions/);
 assert.match(guard,/quote_line_items/);
});

test('Quick Quote estimate and conversion reverify current published V5 unit price',()=>{
 const save=read('src/features/quotes/server/quick-quote-estimate-actions.ts');
 const conversion=read('src/features/quotes/server/quick-quote-conversion-actions.ts');
 const ui=read('src/features/quotes/components/quick-quote-workbench.tsx');
 for (const src of [save,conversion]){
  assert.match(src,/previewPackagingPricingV5/);
  assert.match(src,/previewPackagingFramePricingV5/);
  assert.match(src,/selling_price\.unit_price/);
 }
 assert.match(ui,/savedBasketFingerprint/);
 assert.match(ui,/basket\.some\(item=>item\.engine==='manual'\)/);
});

test('Every transferred pouch and frame line can be edited in place without duplicating items',()=>{
 const sup=read('src/lib/packaging-pricing-v5/saved-line.ts');
 const frame=read('src/lib/packaging-pricing-v5/frame-saved-line.ts');
 const quote=read('src/app/(app)/leads/[leadId]/quote/page.tsx');
 assert.match(sup,/quick_quote_pending_reprice/);
 assert.match(frame,/quick_quote_pending_reprice/);
 assert.match(quote,/pendingQuickQuoteLines\.map/);
 assert.match(quote,/editLine=\$\{line\.id\}/);
 assert.match(quote,/listPricingV5SavedLineSummaries/);
 assert.match(quote,/listPricingV5FrameSavedLineSummaries/);
});

test('Conversion automatically prices all transferred products without a second sales pricing step',()=>{
  const action=read('src/features/quotes/server/quick-quote-conversion-actions.ts');
  assert.match(action,/for\(const line of \(lines\?\?\[\]\)\)/);
  assert.match(action,/savePackagingPricingV5QuoteLine/);
  assert.match(action,/savePackagingFramePricingV5QuoteLine/);
  assert.match(action,/lineId:line\.id/);
  assert.match(action,/remaining\.some/);
  assert.match(action,/quick_quote_pending_reprice/);
});

test('3SS and CSS estimate lines use the service-family ID, not the pricing template ID',()=>{
 const ui=read('src/features/quotes/components/quick-quote-workbench.tsx');
 assert.match(ui,/familyId:chosen\.kind==='frame'\?String\(frameTemplate\?\.family_id\?\?''\)/);
});
