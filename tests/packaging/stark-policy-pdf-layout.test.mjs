import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const pdf=readFileSync('src/app/api/quotes/[quoteId]/pdf/route.ts','utf8');
const policy=readFileSync('src/lib/quotes/stark-packmate-policy.ts','utf8');
test('Stark policy renders all sections and paragraphs as a paginated branded appendix',()=>{
 assert.match(pdf,/for\(const \[sectionIndex, section\] of STARK_PACKMATE_POLICY.entries\(\)\)/);
 assert.match(pdf,/for\(const lines of pointLines\)/);
 assert.match(pdf,/newPage\(\)/);
 assert.match(pdf,/heading\(\)/);
 assert.match(pdf,/QUOTATION APPENDIX/);
 assert.match(pdf,/pdfText\(\(index\+1\)\+' \/ '\+policyPages.length\)/);
 assert.match(pdf,/STARK_PACKMATE_POLICY_ACKNOWLEDGEMENT/);
 assert.match(policy,/12\. Samples & Subsequent Changes/);
});
test('Policy appendix remains Stark-specific and does not alter quotation calculations',()=>{
 assert.match(pdf,/if \(data.includeStarkPolicy\)/);
 assert.match(pdf,/includeStarkPolicy: isStarkPackmateOrganization\(org\)/);
 assert.match(pdf,/const subtotal = data.rows.reduce/);
});
