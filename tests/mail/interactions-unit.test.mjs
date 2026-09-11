import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(relative, stubs = {}) {
  const filename = path.resolve(relative);
  const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { fileName: filename, compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const module = { exports: {} };
  const resolve = id => {
    if (Object.hasOwn(stubs, id)) return stubs[id];
    if (id.startsWith('@/') || id.startsWith('.')) {
      const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(filename), id);
      return load(fs.existsSync(base) ? base : `${base}.ts`, stubs);
    }
    return require(id);
  };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`, { filename })(resolve, module, module.exports);
  return module.exports;
}
const actions = load('src/features/mail/lib/message-actions.ts');
const drafts = load('src/features/mail/lib/compose-state.ts');
const ID = '11111111-1111-4111-8111-111111111111';
const BOX = '22222222-2222-4222-8222-222222222222';
const ORG = '33333333-3333-4333-8333-333333333333';
function message(overrides = {}) { return { id: ID, organization_id: ORG, mailbox_id: BOX, direction: 'inbound', status: 'received', folder: 'inbox', is_read: false, is_starred: false, from_address: 'sender@example.test', to_addresses: [], cc_addresses: [], bcc_addresses: [], text_body: 'body', subject: 'Subject', thread_id: null, ...overrides }; }
function database(rows, attachments = []) {
  const db = { rows, attachments, failRead: false, failUpdate: false, changed: false };
  db.from = table => {
    let filters = [], single = false, patch = null;
    const q = {
      select() { return q; }, eq(key,value) { filters.push(row => row[key] === value); return q; },
      update(value) { patch = value; return q; }, maybeSingle() { single = true; return q; },
      then(resolve,reject) { return Promise.resolve().then(() => {
        if (db.failRead || (patch && db.failUpdate)) return { data: null, error: { code: '08006' } };
        const matches = (table === 'mail_attachments' ? attachments : rows).filter(row => filters.every(f => f(row)));
        if (patch && db.changed) return { data: null, error: null };
        if (patch) matches.forEach(row => Object.assign(row, patch));
        return { data: single ? matches[0] ? { ...matches[0] } : null : matches.map(row => ({ ...row })), error: null };
      }).then(resolve,reject); },
    };
    return q;
  };
  return db;
}
class MailAccessError extends Error { constructor(message,status) { super(message); this.status=status; } }
function route(db, options = {}, draft = false) {
  return load(draft ? 'src/app/api/mail/drafts/route.ts' : 'src/app/api/mail/messages/[id]/route.ts', {
    'next/server': { NextResponse: { json: (data,init) => Response.json(data,init) } },
    '@/lib/mail/organizer-context': { MailAccessError, MAIL_MESSAGE_FIELDS: '*', mailOrganizerContext: async () => { if(options.error)throw new MailAccessError('Denied',options.error);return{db,organizationId:ORG,mailbox:{id:BOX,address:'sales@example.test'},canMove:true,canSend:true,...options}; } },
  });
}
function req(body) { return new Request('https://fixture.example/api/mail/messages/'+ID, body ? {method:'POST',body:JSON.stringify(body)} : {}); }
const params = {params:{id:ID}};

test('star count changes immediately, including a message outside the loaded inbox',()=>{const before=message({folder:'custom'});assert.equal(actions.adjustMailCounts({...actions.EMPTY_MAIL_COUNTS,starred:200},before,{...before,is_starred:true}).starred,201);});
test('mark read and unread adjust only the unread Inbox count',()=>{const before=message({is_starred:true});const read={...before,is_read:true};const initial=actions.countMailFolders([before]);assert.deepEqual(actions.adjustMailCounts(initial,before,read),{...initial,inbox:0});assert.equal(actions.adjustMailCounts({...initial,inbox:0},read,before).inbox,1);});
test('deleting and restoring a starred draft updates Drafts, Starred and Trash',()=>{const before=message({status:'draft',folder:'drafts',is_read:true,is_starred:true});const trashed={...before,folder:'trash'};const initial=actions.countMailFolders([before]);const moved=actions.adjustMailCounts(initial,before,trashed);assert.equal(moved.drafts,0);assert.equal(moved.starred,0);assert.equal(moved.trash,1);assert.deepEqual(actions.adjustMailCounts(moved,trashed,before),initial);});
test('repeated save or read acknowledgement does not double count',()=>{const m=message({status:'draft',folder:'drafts'});const counts=actions.countMailFolders([m]);assert.deepEqual(actions.adjustMailCounts(counts,m,{...m,text_body:'edited'}),counts);});
test('old draft restoration preserves To/Cc/Bcc, body and attached files',()=>{const m=message({to_addresses:['a@example.test'],cc_addresses:['c@example.test'],bcc_addresses:['b@example.test'],status:'draft',folder:'drafts'});const restored=drafts.restoreDraft(m,[{id:'a',message_id:ID},{id:'b',message_id:'other'}]);assert.equal(restored.cc,'c@example.test');assert.equal(restored.bcc,'b@example.test');assert.equal(restored.body,'body');assert.equal(restored.attachments.length,1);});
test('bulk actions deduplicate IDs and expose partial failures without dropping the successful results',async()=>{const a=message(), b=message({id:BOX});const applied=[];const result=await actions.runMailBatch([a,a,b],async m=>{if(m.id===BOX)throw new Error('Denied');return{...m,is_read:true};},(before,after)=>applied.push(after));assert.deepEqual(result.succeeded,[ID]);assert.equal(result.failed.length,1);assert.equal(applied.length,1);});
test('failed network action cannot be acknowledged as saved',async()=>{const old=globalThis.fetch;globalThis.fetch=async()=>Response.json({error:'Unavailable'},{status:503});try{await assert.rejects(actions.persistMessageAction(BOX,message(),'star',true),/Unavailable/);}finally{globalThis.fetch=old;}});
test('message API returns full saved draft and its scoped attachments',async()=>{const m=message({status:'draft',folder:'drafts'});const db=database([m],[{id:'file',message_id:ID,organization_id:ORG,mailbox_id:BOX},{id:'foreign',message_id:ID,organization_id:BOX,mailbox_id:BOX}]);const response=await route(db).GET(req(),params);const data=await response.json();assert.equal(response.status,200);assert.equal(data.message.text_body,'body');assert.deepEqual(data.attachments.map(a=>a.id),['file']);});
test('message GET rejects inaccessible mailbox and invalid ID',async()=>{const api=route(database([message({mailbox_id:ID})]));assert.equal((await api.GET(req(),params)).status,404);assert.equal((await api.GET(req(),{params:{id:'invalid'}})).status,400);});
test('unauthenticated and read-only writes fail closed',async()=>{assert.equal((await route(database([]),{error:401}).GET(req(),params)).status,401);assert.equal((await route(database([message()]),{canMove:false}).PATCH(req({action:'read',value:true}),params)).status,403);});
test('explicit unread false value and legacy mobile boolean contract are retained',async()=>{const db=database([message({is_read:true,is_starred:true})]);const api=route(db);assert.equal((await api.PATCH(req({action:'read',value:false}),params)).status,200);assert.equal(db.rows[0].is_read,false);assert.equal(db.rows[0].is_starred,true);await api.PATCH(req({read:true}),params);assert.equal(db.rows[0].is_read,true);});
test('nonboolean value never silently toggles state',async()=>{const db=database([message()]);assert.equal((await route(db).PATCH(req({action:'star',value:'false'}),params)).status,400);assert.equal(db.rows[0].is_starred,false);});
test('trash keeps the draft recoverable; archive cannot hide drafts',async()=>{const db=database([message({status:'draft',folder:'drafts'})]);const api=route(db);assert.equal((await api.PATCH(req({action:'archive',value:true}),params)).status,409);assert.equal((await api.PATCH(req({action:'trash',value:true}),params)).status,200);assert.equal(db.rows[0].folder,'trash');assert.equal(db.rows[0].status,'draft');await api.PATCH(req({action:'trash',value:false}),params);assert.equal(db.rows[0].folder,'drafts');});
test('concurrent message state changes return conflict rather than a false success',async()=>{const db=database([message()]);db.changed=true;assert.equal((await route(db).PATCH(req({action:'star',value:true}),params)).status,409);});
test('autosave cannot resurrect a trashed draft or overwrite sent mail',async()=>{for(const row of [message({status:'draft',folder:'trash'}),message({status:'sent',folder:'sent'})]){const db=database([row]);assert.equal((await route(db,{},true).POST(req({id:ID,text:'stale body'}))).status,409);assert.equal(row.text_body,'body');}});
test('profile wiring uses an explicit header trigger and never captures mail clicks',()=>{const bridge=fs.readFileSync('src/components/shell/ShellProfileMenuBridge.tsx','utf8');const shell=fs.readFileSync('src/components/layout/app-shell.tsx','utf8');assert.match(bridge,/\[data-shell-profile-trigger\]/);assert.doesNotMatch(bridge,/text\.includes\('@'\)|stopPropagation\(|preventDefault\(|onDocumentClick, true/);assert.match(shell,/data-shell-profile-trigger data-profile-name=\{profileName\}/);});
test('the composer does not advertise markdown-marker insertion as rich formatting',()=>{const source=fs.readFileSync('src/features/mail/components/setu-mail-workspace.tsx','utf8');const controls=fs.readFileSync('src/features/mail/components/mail-interaction-controls.tsx','utf8');assert.doesNotMatch(source,/formatSelection|Formatting foundation/);assert.match(controls,/Plain text/);assert.match(controls,/aria-label="Delete draft"/);assert.match(controls,/Select all loaded messages/);});
test('sidebar counts are authoritative rather than capped at the loaded 200 rows',()=>{const api=fs.readFileSync('src/app/api/mail/route.ts','utf8');assert.match(api,/count: 'exact', head: true/);assert.match(api,/eq\('is_starred', true\)\.neq\('folder', 'trash'\)/);assert.match(api,/Cache-Control.*private, no-store/);});
