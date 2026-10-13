import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const file=(name)=>readFileSync(name,'utf8');
const draft=file('src/features/quotes/server/lead-draft-actions.ts');
const builder=file('src/features/quotes/canonical/CanonicalQuoteBuilder.tsx');
const pdf=file('src/app/api/quotes/[quoteId]/pdf/route.ts');
const publicPage=file('src/app/quote-review/[token]/page.tsx');
const quotePage=file('src/app/(app)/leads/[leadId]/quote/page.tsx');
const share=file('src/features/packaging/server/customer-review-actions.ts');
test('Stark quote draft does not automatically insert captured lead requirements',()=>{
 assert.match(draft,/workspace\.organization\.id !== 'b97913cb-3b95-4247-8ced-ffdc0d392d2a'/);
});
test('unused source requirements are never customer quotation lines',()=>{
 for(const [name,s] of [['builder',builder],['pdf',pdf],['public link',publicPage],['quote editor',quotePage]]){
  assert.match(s,/lead_requirement/,name);
  assert.match(s,/unit_price/,name);
  assert.doesNotMatch(s,/return !matched;/,name);
 }
});
test('customer sharing rejects unpriced selected quote lines',()=>{
 assert.match(share,/selectedLines\.some/);
 assert.match(share,/selectedShareLines\.some/);
 assert.match(share,/Price or remove every selected item/);
});
