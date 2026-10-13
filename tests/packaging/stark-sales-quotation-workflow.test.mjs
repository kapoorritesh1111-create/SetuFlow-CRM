import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const lead=fs.readFileSync('src/features/leads/canonical/StarkLeadDetailApproved.tsx','utf8');
const studio=fs.readFileSync('src/features/packaging/components/premium-packaging-quote-builder-v5.tsx','utf8');
const draft=fs.readFileSync('src/features/quotes/server/lead-draft-actions.ts','utf8');
const sql=fs.readFileSync('supabase/migrations/20261013184500_stark_quote_revision_transaction.sql','utf8');
test('lead detail shows protected history with direct quote preview and revised offers',()=>{
 assert.match(lead,/Customer Quotations/);
 assert.match(lead,/Sent \/ History/);
 assert.match(lead,/Read only/);
 assert.match(lead,/createLeadQuoteDraftFromLead/);
 assert.match(lead,/source_quote_id/);
 assert.match(lead,/Quotation PDF/);
});
test('multi-product workspace switches family without dropping basket',()=>{
 assert.match(studio,/Product family switcher/);
 assert.match(studio,/setActive\(family\)/);
 assert.match(studio,/aria-label="Live quote basket"/);
 assert.match(studio,/recalculate before saving/);
});
test('revisions clone in one transaction, reset prices and preserve original',()=>{
 assert.match(draft,/app_create_stark_quote_revision_tx/);
 assert.match(sql,/public\.app_create_stark_quote_revision_tx/);
 assert.match(sql,/from public\.quote_line_items/);
 assert.match(sql,/p_source_quote_id/);
 assert.match(sql,/v_line\.quantity,0,v_line\.currency/);
 assert.match(sql,/quote_revision_created/);
 assert.doesNotMatch(sql,/update public\.quotes set[^;]*where id=p_source_quote_id/i);
});
