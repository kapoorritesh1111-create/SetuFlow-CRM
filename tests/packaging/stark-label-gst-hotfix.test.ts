import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path:string)=>readFileSync(path,'utf8');

test('Stark legacy label quote: review, PDF, and sales share GST reconciliation',()=>{
 const resolver=read('src/lib/quotes/stark-label-gst.ts');
 assert.match(resolver,/label_workbook_v5/);
 assert.match(resolver,/STARK_PACKMATE_GST_RATE = 18/);
 assert.match(resolver,/organizationId !== STARK_PACKMATE_ID/);
 assert.match(read('src/app/quote-review/[token]/page.tsx'),/quoteLineGst\(line,quote.organization_id\)/);
 assert.match(read('src/app/api/quotes/[quoteId]/pdf/route.ts'),/quoteLineGst\(line,resolvedOrganizationId\)/);
 assert.match(read('src/features/packaging/server/stark-label-quote-actions.ts'),/p_sales_pricing:salesPricing/);
});
