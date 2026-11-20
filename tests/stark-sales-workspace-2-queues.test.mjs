import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const p='src/features/integrations/interakt/inbound-action-classification.ts';
const output=ts.transpileModule(readFileSync(p,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('module','exports',output)(module,module.exports);
const {classifyInboundNextAction:classify}=module.exports;
const now=Date.parse('2026-11-20T12:00:00Z');
const inquiry={source_provider:'interakt',last_inbound_at:'2026-11-20T11:00:00Z',last_outbound_at:null};
test('open inbound customer message is reply now',()=>assert.equal(classify(inquiry,now),'reply_now'));
test('expired customer message is reconnect, not free-form reply',()=>assert.equal(classify({...inquiry,last_inbound_at:'2026-11-18T11:00:00Z'},now),'reconnect'));
test('recent outbound is waiting even with obsolete needs reply flag',()=>assert.equal(classify({...inquiry,last_outbound_at:'2026-11-20T11:05:00Z',needs_reply:true},now),'waiting'));
test('browsing, converted and IndiaMART are not assumed WhatsApp reply-now',()=>{
  assert.equal(classify({...inquiry,browsing_only:true},now),'review');
  assert.equal(classify({...inquiry,qualified_lead_id:'lead-id'},now),'converted');
  assert.equal(classify({...inquiry,source_provider:'indiamart'},now),'review');
});

