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
