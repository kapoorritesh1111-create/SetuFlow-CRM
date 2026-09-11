import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHmac, randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const root = process.cwd();

// Exercise the production TypeScript modules with an isolated database/provider.
// This is a regression suite, not a replacement for authenticated production UAT.
function load(relative, stubs = {}, cache = new Map()) {
  const filename = path.resolve(root, relative);
  if (cache.has(filename)) return cache.get(filename).exports;
  const text = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(text, { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} }; cache.set(filename, module);
  const localRequire = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('.') || id.startsWith('@/')) {
      const absolute = id.startsWith('@/') ? path.join(root, 'src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      return load(fs.existsSync(absolute) ? absolute : `${absolute}.ts`, stubs, cache);
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(localRequire, module, module.exports);
  return module.exports;
}
const engine = load('src/lib/mail/organization.ts');
const client = load('src/features/mail/lib/organizer-client.ts');
const claimModule = load('src/lib/mail/webhook-claim.ts');
const ORG = '11111111-1111-4111-8111-111111111111';
const BOX = '22222222-2222-4222-8222-222222222222';
const FOLDER = '33333333-3333-4333-8333-333333333333';
const OTHER = '44444444-4444-4444-8444-444444444444';
const MESSAGE = '55555555-5555-4555-8555-555555555555';
const NOW = '2026-09-11T10:00:00.000Z';
const mail = { organizationId: ORG, mailboxId: BOX, direction: 'inbound', from: 'buyer@acme.com', to: ['sales@setu.example'], cc: ['team@setu.example'], subject: 'Please send QUOTATION', hasAttachment: true };
function rule(overrides = {}) { return { id: randomUUID(), organization_id: ORG, mailbox_id: BOX, created_at: NOW, ...engine.validateRule({ name: 'Quotes', conditions: { fromDomain: 'acme.com' }, actions: { moveToFolderId: FOLDER, star: true } }), ...overrides }; }
function folder(overrides = {}) { return { id: FOLDER, organization_id: ORG, mailbox_id: BOX, name: 'Customers', slug: 'customers', ...overrides }; }
function message(overrides = {}) { return { id: MESSAGE, organization_id: ORG, mailbox_id: BOX, direction: 'inbound', status: 'received', folder: 'inbox', custom_folder_id: null, is_read: false, is_starred: true, from_address: mail.from, to_addresses: mail.to, cc_addresses: [], bcc_addresses: [], subject: 'Quotation', text_body: 'Hello', thread_id: null, created_at: NOW, ...overrides }; }

function memoryDb(seed = {}) {
  const tables = { mail_folders: [], mail_rules: [], mail_messages: [], mail_threads: [], mail_aliases: [], mail_attachments: [], mail_entitlements: [], mail_webhook_events: [], mail_mailboxes: [{ id: BOX, organization_id: ORG, address: 'sales@setu.example', status: 'active' }], ...structuredClone(seed) };
  const db = { tables, trace: [], fail: null, storage: { from: () => ({ upload: async () => ({ error: null }) }) } };
  db.from = table => {
    let op = 'select', values, filters = [], orders = [], start = 0, end = Infinity, single = false, options = {}, projection = false;
    const q = {
      select(_fields, opts = {}) { options = opts; projection = true; return q; },
      insert(value) { op = 'insert'; values = Array.isArray(value) ? value : [value]; return q; },
      update(value) { op = 'update'; values = value; return q; },
      delete() { op = 'delete'; return q; },
      eq(k,v) { filters.push(row => row[k] === v); return q; },
      neq(k,v) { filters.push(row => row[k] !== v); return q; },
      is(k,v) { filters.push(row => (row[k] ?? null) === v); return q; },
      in(k,v) { filters.push(row => v.includes(row[k])); return q; },
      not(k,_operator,v) { filters.push(row => row[k] !== v); return q; },
      order(k,opts = {}) { orders.push([k,opts.ascending !== false]); return q; },
      limit(n) { end = n - 1; return q; },
      range(a,b) { start = a; end = b; return q; },
      single() { single = true; return q; },
      maybeSingle() { single = true; return q; },
      then(resolve,reject) {
        return Promise.resolve().then(() => {
          db.trace.push({ table, op });
          const injected = db.fail?.(table, op, values);
          if (injected) return { data: null, error: injected, count: null };
          let rows = (tables[table] ?? []).filter(row => filters.every(check => check(row)));
          if (op === 'insert') {
            for (const value of values) {
              if (table === 'mail_webhook_events' && tables[table].some(row => row.svix_id === value.svix_id)) return { data: null, error: { code: '23505' } };
              if (table === 'mail_messages' && value.provider_message_id && tables[table].some(row => row.mailbox_id === value.mailbox_id && row.provider_message_id === value.provider_message_id)) return { data: null, error: { code: '23505' } };
              if (table === 'mail_folders' && tables[table].some(row => row.mailbox_id === value.mailbox_id && row.slug === value.slug)) return { data: null, error: { code: '23505' } };
            }
            rows = values.map(value => ({ id: randomUUID(), created_at: NOW, ...value }));
            (tables[table] ??= []).push(...rows);
          } else if (op === 'update') { rows.forEach(row => Object.assign(row, values)); }
          else if (op === 'delete') {
            if (table === 'mail_folders' && rows.some(row => tables.mail_messages.some(m => m.custom_folder_id === row.id) || tables.mail_rules.some(r => r.target_folder_id === row.id))) return { data: null, error: { code: '23503' } };
            tables[table] = tables[table].filter(row => !rows.includes(row));
          }
          const count = rows.length;
          rows = [...rows].sort((a,b) => { for (const [key,ascending] of orders) { const d = String(a[key] ?? '').localeCompare(String(b[key] ?? '')); if (d) return ascending ? d : -d; } return 0; }).slice(start, end + 1);
          return { data: options.head || (op !== 'select' && !projection) ? null : single ? rows[0] ?? null : rows.map(row => ({ ...row })), error: null, count };
        }).then(resolve,reject);
      },
    };
    return q;
  };
  db.rpc = async (_name, args) => ({ data: tables.mail_folders.filter(f => f.organization_id === args.p_organization_id && f.mailbox_id === args.p_mailbox_id).map(f => ({ ...f, message_count: tables.mail_messages.filter(m => m.custom_folder_id === f.id).length, unread_count: tables.mail_messages.filter(m => m.custom_folder_id === f.id && !m.is_read).length })), error: null });
  return db;
}
class AccessError extends Error { constructor(message,status) { super(message); this.status = status; } }
const next = { NextResponse: { json: (body,init) => Response.json(body,init) } };
function organizerRoute(db, access = {}) {
  return load('src/app/api/mail/organizer/route.ts', { 'next/server': next, '@/lib/mail/organizer-context': { MailAccessError: AccessError, MAIL_MESSAGE_FIELDS: '*', mailOrganizerContext: async () => {
    if (access.error) throw new AccessError('Denied', access.error);
    return { db, organizationId: ORG, userId: OTHER, mailbox: { id: BOX }, canMove: true, canManage: true, ...access };
  } } });
}
function request(payload, suffix = '') { const r = new Request(`https://setu.example/api/mail/organizer?mailboxId=${BOX}${suffix}`, payload ? { method: 'POST', body: JSON.stringify(payload) } : {}); r.nextUrl = new URL(r.url); return r; }

for (const name of ['Inbox', 'drafts', '', 'a/b', 'a\\b', 'bad\nname', 'a'.repeat(65)]) test(`reject folder name ${JSON.stringify(name)}`, () => assert.throws(() => engine.folderName(name)));
test('folder names normalize without changing stored identity', () => assert.deepEqual(engine.folderName('  Customer   Quotes  '), { name: 'Customer Quotes', slug: 'customer quotes' }));
test('rules require conditions and effective actions', () => { assert.throws(() => engine.validateRule({ name: 'All', conditions: {}, actions: { star: true } })); assert.throws(() => engine.validateRule({ name: 'All', conditions: { fromDomain: 'acme.com' }, actions: { star: false } })); });
test('a rule cannot archive and move at once', () => assert.throws(() => engine.validateRule({ name: 'Bad', conditions: { fromDomain: 'acme.com' }, actions: { archive: true, moveToFolderId: FOLDER } })));
test('all condition types combine with AND', () => { const c = { fromAddress: mail.from.toUpperCase(), fromDomain: 'ACME.COM', subjectContains: 'quotation', recipient: mail.cc[0], hasAttachment: true }; assert.equal(engine.ruleMatches(c, mail), true); assert.equal(engine.ruleMatches({ ...c, subjectContains: 'invoice' }, mail), false); });
test('sender domains match exactly, not subdomains', () => assert.equal(engine.ruleMatches({ fromDomain: 'acme.com' }, { ...mail, from: 'a@notacme.com' }), false));
test('unknown attachment metadata never matches no-attachment', () => assert.equal(engine.ruleMatches({ hasAttachment: false }, { ...mail, hasAttachment: null }), false));
test('outbound mail never matches inbound rules', () => assert.equal(engine.ruleMatches({ fromDomain: 'acme.com' }, { ...mail, direction: 'outbound' }), false));
test('lower priority wins; subsequent rules do not alter its result', () => { const first = rule({ priority: 1 }); const nextRule = rule({ priority: 2, actions: { archive: true }, target_folder_id: null }); const result = engine.incomingRulePatch([nextRule,first], mail, new Set([FOLDER]), NOW); assert.equal(result.matchedRuleId, first.id); assert.equal(result.folder, 'custom'); });
test('paused rules and cross-workspace/mailbox rules never run', () => { for (const r of [rule({ enabled: false }), rule({ organization_id: OTHER }), rule({ mailbox_id: OTHER })]) assert.equal(engine.incomingRulePatch([r], mail, new Set([FOLDER]), NOW).matchedRuleId, null); });
test('deleted destinations and malformed rules fail safely to inbox', () => { assert.equal(engine.incomingRulePatch([rule()], mail, new Set(), NOW).folder, 'inbox'); assert.equal(engine.incomingRulePatch([rule({ conditions: { unsafe: true } })], mail, new Set([FOLDER]), NOW).folder, 'inbox'); });
test('manual moves preserve read/star state and reject drafts', () => { const original = message(); const moved = { ...original, ...engine.movePatch(original,FOLDER) }; assert.equal(moved.is_read, original.is_read); assert.equal(moved.is_starred, original.is_starred); assert.throws(() => engine.movePatch(message({ status: 'draft' }),FOLDER)); });
test('returning outbound custom mail targets Sent', () => assert.equal(engine.movePatch({ direction: 'outbound', status: 'sent' },null).folder,'sent'));
test('page append deduplicates IDs and never mixes folders', () => { const a = { folder: {id:FOLDER}, messages:[message()], attachments:[], total:2, nextOffset:1 }; const b = { ...a, messages:[message({is_read:true}),message({id:OTHER})], nextOffset:null }; assert.equal(client.appendFolderPage(a,b).messages.length,2); assert.equal(client.appendFolderPage(a,{...b,folder:{id:OTHER}}).messages.length,2); });
test('moving a loaded row out updates pagination offset', () => { const page={folder:{id:FOLDER},messages:[message({folder:'custom',custom_folder_id:FOLDER})],attachments:[],total:201,nextOffset:100}; const nextPage=client.updateFolderMessage(page,message()); assert.equal(nextPage.messages.length,0); assert.equal(nextPage.total,200); assert.equal(nextPage.nextOffset,99); });
test('organizer URLs carry mailbox and folder scope', () => { const url=new URL(client.organizerUrl(BOX,FOLDER,100),'https://setu.example'); assert.equal(url.searchParams.get('mailboxId'),BOX); assert.equal(url.searchParams.get('offset'),'100'); });
test('rule summaries describe actions, not database IDs', () => assert.match(client.describeRule(rule(),[folder()]).actions,/Move to Customers/));

test('folder create, rename, and delete use scoped API', async () => { const db=memoryDb(); const api=organizerRoute(db); const r=await api.POST(request({action:'createFolder',name:' Customers '})); assert.equal(r.status,200); const id=(await r.json()).folder.id; assert.equal(db.tables.mail_folders[0].mailbox_id,BOX); assert.equal((await api.POST(request({action:'renameFolder',id,name:'Buyers'}))).status,200); assert.equal((await api.POST(request({action:'deleteFolder',id}))).status,200); });
test('duplicate folders return conflict instead of overwriting', async () => { const api=organizerRoute(memoryDb({mail_folders:[folder()]})); assert.equal((await api.POST(request({action:'createFolder',name:'Customers'}))).status,409); });
test('nonempty and rule-bound folders cannot be deleted', async () => { for (const seed of [{mail_messages:[message({custom_folder_id:FOLDER})]},{mail_rules:[rule()]}]) {const api=organizerRoute(memoryDb({mail_folders:[folder()],...seed})); assert.equal((await api.POST(request({action:'deleteFolder',id:FOLDER}))).status,409);} });
test('manual move immediately returns preserved message state', async () => { const db=memoryDb({mail_folders:[folder()],mail_messages:[message()]}); const result=await organizerRoute(db).POST(request({action:'moveMessage',id:MESSAGE,folderId:FOLDER})); assert.equal(result.status,200); const body=await result.json(); assert.equal(body.message.custom_folder_id,FOLDER); assert.equal(body.message.is_starred,true); });
test('read-only mailbox cannot move or manage folders/rules', async () => { const api=organizerRoute(memoryDb(),{canManage:false,canMove:false}); for(const payload of [{action:'moveMessage',id:MESSAGE,folderId:FOLDER},{action:'createFolder',name:'A'},{action:'createRule',rule:rule()}]) assert.equal((await api.POST(request(payload))).status,403); });
test('sender access alone cannot create shared rules', async () => { const api=organizerRoute(memoryDb(),{canManage:false,canMove:true}); assert.equal((await api.POST(request({action:'createRule',rule:rule()}))).status,403); });
test('cross-workspace target folder is rejected', async () => { const db=memoryDb({mail_folders:[folder({organization_id:OTHER})],mail_messages:[message()]}); assert.equal((await organizerRoute(db).POST(request({action:'moveMessage',id:MESSAGE,folderId:FOLDER}))).status,404); });
test('cross-mailbox message cannot be moved', async () => { const db=memoryDb({mail_folders:[folder()],mail_messages:[message({mailbox_id:OTHER})]}); assert.equal((await organizerRoute(db).POST(request({action:'moveMessage',id:MESSAGE,folderId:FOLDER}))).status,404); });
test('rule create, pause, edit, and delete round trip', async () => { const db=memoryDb({mail_folders:[folder()]}); const api=organizerRoute(db); const created=await api.POST(request({action:'createRule',rule:rule()})); assert.equal(created.status,200); const saved=(await created.json()).rule; assert.equal((await api.POST(request({action:'updateRule',id:saved.id,rule:{...saved,enabled:false}}))).status,200); assert.equal(db.tables.mail_rules[0].enabled,false); assert.equal((await api.POST(request({action:'deleteRule',id:saved.id}))).status,200); });
test('folder pagination returns attachments only for the requested page and scope', async () => { const messages=Array.from({length:101},(_,i)=>message({id:String(i),folder:'custom',custom_folder_id:FOLDER})); const db=memoryDb({mail_folders:[folder()],mail_messages:messages,mail_attachments:[{id:'a',organization_id:ORG,mailbox_id:BOX,message_id:'0'},{id:'foreign',organization_id:OTHER,mailbox_id:BOX,message_id:'0'}]}); const response=await organizerRoute(db).GET(request(null,`&folderId=${FOLDER}`)); const body=await response.json(); assert.equal(body.messages.length,100); assert.equal(body.total,101); assert.equal(body.nextOffset,100); assert.deepEqual(body.attachments.map(a=>a.id),['a']); });
test('invalid folder offset and unauthenticated API requests fail', async () => { assert.equal((await organizerRoute(memoryDb()).GET(request(null,`&folderId=${FOLDER}&offset=-1`))).status,400); assert.equal((await organizerRoute(memoryDb(),{error:401}).GET(request())).status,401); });

test('webhook lease accepts a new event', async () => { const result=await claimModule.claimMailWebhook(memoryDb(),{svix_id:'new'},NOW); assert.equal(result.claimed,true); });
test('completed events are duplicates; database failures are not', async () => { const db=memoryDb({mail_webhook_events:[{svix_id:'done',status:'processed'}]}); assert.equal((await claimModule.claimMailWebhook(db,{svix_id:'done'},NOW)).duplicate,true); db.fail=()=>({code:'08006'}); await assert.rejects(claimModule.claimMailWebhook(db,{svix_id:'failed'},NOW)); });
test('failed events can be reclaimed for retry', async () => { const db=memoryDb({mail_webhook_events:[{id:'e',svix_id:'retry',status:'failed',processed_at:NOW}]}); assert.equal((await claimModule.claimMailWebhook(db,{svix_id:'retry'},NOW)).claimed,true); });
test('active processing lease returns retry, not success acknowledgement', async () => { const db=memoryDb({mail_webhook_events:[{id:'e',svix_id:'busy',status:'processing',processed_at:NOW}]}); const result=await claimModule.claimMailWebhook(db,{svix_id:'busy'},NOW); assert.equal(result.claimed,false); assert.equal(result.duplicate,false); });
test('stale processing lease is recoverable', async () => { const db=memoryDb({mail_webhook_events:[{id:'e',svix_id:'old',status:'processing',processed_at:'2026-09-11T09:00:00Z'}]}); assert.equal((await claimModule.claimMailWebhook(db,{svix_id:'old'},NOW)).claimed,true); });

function inboundRequest(id='event-1') {
  const payload=JSON.stringify({type:'email.received',created_at:NOW,data:{email_id:'provider-1'}});
  const timestamp=String(Math.floor(Date.now()/1000));
  const signature=createHmac('sha256',Buffer.from('test-webhook-key')).update(`${id}.${timestamp}.${payload}`).digest('base64');
  return new Request('https://setu.example/api/mail/webhooks/resend',{method:'POST',headers:{'svix-id':id,'svix-timestamp':timestamp,'svix-signature':`v1,${signature}`},body:payload});
}
async function runInbound(db, options={}) {
  const previousFetch=globalThis.fetch; const previousSecret=process.env.RESEND_WEBHOOK_SECRET; const previousKey=process.env.RESEND_API_KEY;
  process.env.RESEND_WEBHOOK_SECRET=`whsec_${Buffer.from('test-webhook-key').toString('base64')}`; process.env.RESEND_API_KEY='test-only';
  globalThis.fetch=async url=>String(url).endsWith('/attachments') ? Response.json(options.attachments ?? {data:[]},{status:options.attachmentFailure?503:200}) : Response.json({to:['sales@setu.example'],from:'buyer@acme.com',subject:'Quotation',text:'Hello',headers:{}});
  try { const route=load('src/app/api/mail/webhooks/resend/route.ts',{'next/server':next,'@/lib/supabase/admin':{createAdminSupabaseClient:()=>db}}); return await route.POST(inboundRequest(options.eventId)); }
  finally {globalThis.fetch=previousFetch; if(previousSecret===undefined)delete process.env.RESEND_WEBHOOK_SECRET;else process.env.RESEND_WEBHOOK_SECRET=previousSecret;if(previousKey===undefined)delete process.env.RESEND_API_KEY;else process.env.RESEND_API_KEY=previousKey;}
}
test('signed inbound webhook applies rule before saving email', async () => { const r=rule(); const db=memoryDb({mail_rules:[r],mail_folders:[folder()]}); assert.equal((await runInbound(db)).status,200); const stored=db.tables.mail_messages[0]; assert.equal(stored.folder,'custom'); assert.equal(stored.custom_folder_id,FOLDER); assert.equal(stored.metadata.matched_rule_id,r.id); assert.ok(db.trace.findIndex(x=>x.table==='mail_rules')<db.trace.findIndex(x=>x.table==='mail_messages'&&x.op==='insert')); });
test('redelivery with a new event ID never undoes a manual move', async () => { const db=memoryDb({mail_rules:[rule()],mail_folders:[folder()]}); await runInbound(db); db.tables.mail_messages[0].folder='archive'; db.tables.mail_messages[0].custom_folder_id=null; const reads=db.trace.filter(x=>x.table==='mail_rules').length; assert.equal((await runInbound(db,{eventId:'event-2'})).status,200); assert.equal(db.tables.mail_messages.length,1); assert.equal(db.tables.mail_messages[0].folder,'archive'); assert.equal(db.trace.filter(x=>x.table==='mail_rules').length,reads); });
test('rule database failure still receives into Inbox with diagnostic metadata', async () => { const db=memoryDb(); db.fail=(table,op)=>table==='mail_rules'&&op==='select'?{code:'08006'}:null; const previous=console.error; console.error=()=>{}; try {assert.equal((await runInbound(db)).status,200);}finally{console.error=previous;} assert.equal(db.tables.mail_messages[0].folder,'inbox'); assert.equal(db.tables.mail_messages[0].metadata.rule_status,'unavailable'); });
test('attachment lookup failure cannot incorrectly route no-attachment mail', async () => { const db=memoryDb({mail_rules:[rule({conditions:{hasAttachment:false}})],mail_folders:[folder()]}); await runInbound(db,{attachmentFailure:true}); assert.equal(db.tables.mail_messages[0].folder,'inbox'); });
test('attachment metadata can trigger a has-attachment rule', async () => { const db=memoryDb({mail_rules:[rule({conditions:{hasAttachment:true}})],mail_folders:[folder()]}); await runInbound(db,{attachments:{data:[{filename:'quote.pdf'}]}}); assert.equal(db.tables.mail_messages[0].folder,'custom'); });
test('a failed provider attempt can retry without dropping the event', async () => { const db=memoryDb(); let failOnce=true; db.fail=(table,op)=>{if(table==='mail_messages'&&op==='insert'&&failOnce){failOnce=false;return{code:'08006'};}return null;}; assert.equal((await runInbound(db)).status,500); assert.equal(db.tables.mail_webhook_events[0].status,'failed'); assert.equal((await runInbound(db)).status,200); assert.equal(db.tables.mail_messages.length,1); });

test('new organization controls use brand tokens and existing icon library', () => { const css=fs.readFileSync('src/features/mail/components/mail-organization.module.css','utf8'); const ui=fs.readFileSync('src/features/mail/components/mail-organization-controls.tsx','utf8'); assert.match(css,/font-family: var\(--sf-font-sans\)/); assert.doesNotMatch(css,/#[0-9a-f]{3,8}\b|rgb\(/i); assert.match(ui,/from 'lucide-react'/); assert.match(ui,/showModal\(\)/); });
test('workspace wires folder selection, row and reader Move, rule dialogs and paging', () => { const source=fs.readFileSync('src/features/mail/components/setu-mail-workspace.tsx','utf8'); for(const marker of ['useMailOrganizer','MailFolderSidebar','MoveMailDialog','organizer.loadMore','organizer.applyMessage']) assert.ok(source.includes(marker)); assert.equal((source.match(/<MoveMailButton\b/g)||[]).length,2); });
