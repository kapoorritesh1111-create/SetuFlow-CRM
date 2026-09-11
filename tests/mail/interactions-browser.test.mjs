import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

// Real production React components and hooks. Only API data and icon rendering
// are simulated; this is engineering regression coverage, not production UAT.
function browserBundle() {
  const modules = new Map(); const css = [];
  function add(file) {
    if (modules.has(file)) return file;
    modules.set(file, '');
    if (file === 'mock:icons') {
      const react = add(require.resolve('react'));
      modules.set(file, `const React=require(${JSON.stringify(react)});module.exports=new Proxy({}, {get:(_,name)=>props=>React.createElement('svg',{'aria-hidden':true,width:props.size||16,height:props.size||16,...props})});`);
      return file;
    }
    if (file.endsWith('.css')) {
      const prefix = path.basename(file).replace(/\W/g, '_');
      css.push(fs.readFileSync(file, 'utf8').replace(/\.([a-zA-Z_][\w-]*)/g, (_, name) => `.${prefix}_${name}`));
      modules.set(file, `module.exports={__esModule:true,default:new Proxy({}, {get:(_,key)=>${JSON.stringify(prefix + '_')}+key})};`);
      return file;
    }
    let source = fs.readFileSync(file, 'utf8');
    if (/\.tsx?$/.test(file)) source = ts.transpileModule(source, { fileName: file, compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
    source = source.replace(/require\(['"]([^'"]+)['"]\)/g, (_, id) => {
      let target;
      if (id === 'lucide-react') target = 'mock:icons';
      else if (id.startsWith('@/') || id.startsWith('.')) {
        const base = id.startsWith('@/') ? path.resolve('src', id.slice(2)) : path.resolve(path.dirname(file), id);
        target = [base, base + '.ts', base + '.tsx', base + '.js', path.join(base, 'index.js')].find(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile());
        if (!target) throw new Error(`Cannot bundle ${id} from ${file}`);
      } else target = require.resolve(id, { paths: [path.dirname(file)] });
      return `require(${JSON.stringify(add(target))})`;
    });
    modules.set(file, source); return file;
  }
  const react = add(require.resolve('react')); const dom = add(require.resolve('react-dom/client'));
  const workspace = add(path.resolve('src/features/mail/components/setu-mail-workspace.tsx'));
  const bridge = add(path.resolve('src/components/shell/ShellProfileMenuBridge.tsx'));
  const code = `(()=>{const process={env:{NODE_ENV:'production'}};const definitions={${[...modules].map(([id,source]) => `${JSON.stringify(id)}:function(require,module,exports){\n${source}\n}`).join(',')}};const cache={};function require(id){if(cache[id])return cache[id].exports;const m=cache[id]={exports:{}};definitions[id](require,m,m.exports);return m.exports;}const React=require(${JSON.stringify(react)});require(${JSON.stringify(dom)}).createRoot(document.getElementById('root')).render(React.createElement(React.Fragment,null,React.createElement(require(${JSON.stringify(workspace)}).SetuMailWorkspace,{userName:'Fixture User',userEmail:'profile@example.test',organizationName:'Fixture'}),React.createElement(require(${JSON.stringify(bridge)}).ShellProfileMenuBridge)));})();`;
  return { code, css: css.join('\n') };
}
const BOX = '22222222-2222-4222-8222-222222222222';
const FOLDER = '33333333-3333-4333-8333-333333333333';
const A = '11111111-1111-4111-8111-111111111111';
const B = '44444444-4444-4444-8444-444444444444';
const D = '55555555-5555-4555-8555-555555555555';
const base = { thread_id: null, from_address: 'buyer@example.test', to_addresses: ['sales@example.test'], cc_addresses: [], bcc_addresses: [], subject: '', text_body: '', created_at: '2026-09-10T10:00:00Z', is_read: false, is_starred: false, custom_folder_id: null, status: 'received', folder: 'inbox', direction: 'inbound' };
const initialMessages = [{...base,id:A,subject:'Inbox A',text_body:'First message'},{...base,id:B,subject:'Inbox B',text_body:'Second message'},{...base,id:D,subject:'Older saved draft',text_body:'Existing draft body',status:'draft',folder:'drafts',direction:'outbound',is_read:true,to_addresses:['customer@example.test'],cc_addresses:['copy@example.test'],bcc_addresses:['private@example.test']}];
function mockApi() {
  window.requests = []; window.failIds = [];
  const counts = () => ({ inbox: window.messages.filter(m=>m.folder==='inbox'&&!m.is_read).length, sent: window.messages.filter(m=>m.folder==='sent').length, drafts: window.messages.filter(m=>m.folder==='drafts'&&m.status==='draft').length, starred: window.messages.filter(m=>m.is_starred&&m.folder!=='trash').length, archive: window.messages.filter(m=>m.folder==='archive').length, trash: window.messages.filter(m=>m.folder==='trash').length });
  window.fetch = async (input,init={}) => {
    const url=new URL(input,'https://fixture.example'); const method=init.method||'GET'; const body=init.body?JSON.parse(init.body):null;
    window.requests.push({url:url.pathname,method,body});
    const json=(data,status=200)=>Response.json(data,{status});
    if(url.pathname==='/api/mail')return json({mailbox:{id:window.box,address:'sales@example.test'},messages:window.messages,attachments:[],signature:null,counts:counts(),providerReady:true,inboundReady:true});
    if(url.pathname==='/api/mail/organizer') {
      if(method==='POST') {const m=window.messages.find(x=>x.id===body.id);if(window.failIds.includes(m?.id))return json({error:'Fixture failure'},503);Object.assign(m,{folder:body.folderId?'custom':m.direction==='outbound'?'sent':'inbox',custom_folder_id:body.folderId});return json({ok:true,message:m});}
      if(url.searchParams.has('folderId')) {const id=url.searchParams.get('folderId');const messages=window.messages.filter(m=>m.custom_folder_id===id);return json({folder:{id,name:'Customers'},messages,attachments:[],total:messages.length,nextOffset:null});}
      return json({mailboxId:window.box,folders:[{id:window.folder,name:'Customers',message_count:window.messages.filter(m=>m.folder==='custom').length,unread_count:0}],rules:[],canManage:true,canMove:true});
    }
    if(url.pathname.startsWith('/api/mail/messages/')) {
      const id=url.pathname.split('/').pop();const m=window.messages.find(x=>x.id===id);
      if(!m)return json({error:'Not found'},404);
      if(method==='GET')return json({message:m,attachments:[]});
      if(window.failIds.includes(id))return json({error:'Fixture failure'},503);
      if(body.action==='read')m.is_read=body.value;
      if(body.action==='star')m.is_starred=body.value;
      if(body.action==='trash'){m.folder=body.value?'trash':m.status==='draft'?'drafts':m.direction==='outbound'?'sent':'inbox';m.custom_folder_id=null;}
      if(body.action==='archive'){m.folder=body.value?'archive':m.direction==='outbound'?'sent':'inbox';m.custom_folder_id=null;}
      return json({ok:true,message:m});
    }
    if(url.pathname==='/api/mail/drafts') {
      let m=window.messages.find(x=>x.id===body.id);
      if(body.id&&(!m||m.folder!=='drafts'))return json({error:'Draft was moved'},409);
      if(!m){m={id:'66666666-6666-4666-8666-666666666666',direction:'outbound',status:'draft',folder:'drafts',is_read:true,is_starred:false,from_address:'sales@example.test',created_at:new Date().toISOString()};window.messages.push(m);}
      Object.assign(m,{to_addresses:body.to,cc_addresses:body.cc,bcc_addresses:body.bcc,subject:body.subject,text_body:body.text,thread_id:body.threadId,draft_saved_at:new Date().toISOString()});
      return json({ok:true,draft:m});
    }
    if(url.pathname.startsWith('/api/mail/intelligence/'))return json({crmMatch:null,peerAddress:'buyer@example.test',intents:[]});
    return json({error:'Unexpected fixture endpoint'},500);
  };
}
async function clickButton(page, text, scope='') {
  for (const button of await page.$$(`${scope} button`)) if ((await button.evaluate(el=>el.textContent.trim()))===text) {await page.waitForFunction(el=>!el.disabled,{},button);await button.click();return;}
  throw new Error(`Button not found: ${text}`);
}
async function folderClick(page,index){await page.click(`aside .space-y-1 > button:nth-child(${index})`);}
async function checkCount(page, name, value) {await page.waitForFunction((name,value)=>[...document.querySelectorAll('aside .space-y-1 > button')].some(b=>b.textContent.trim()===name+value),{},name,value);}
async function enabledClick(page, selector) {await page.waitForFunction(selector=>{const el=document.querySelector(selector);return el&&!el.disabled;},{},selector);await page.click(selector);}

test('Mail interactions in Chromium with real React and simulated API', {timeout:120000}, async t => {
  const chromiumModule=require('@sparticuz/chromium'); const chromium=chromiumModule.default ?? chromiumModule;
  const puppeteer=require('puppeteer-core');
  const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:1600,height:1100}});
  const bundle=browserBundle();
  async function fixture() {
    const page=await browser.newPage();page.setDefaultTimeout(6000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.setContent(`<html><head><style>body{font-family:sans-serif}aside{width:240px}button,input{margin:2px}button{cursor:pointer}.flex{display:flex}.flex-col{flex-direction:column}.flex-1{flex:1}.min-w-0{min-width:0}.h-full{height:100%}.hidden{display:none}#root{height:850px}${fs.readFileSync('src/app/design-tokens.css','utf8')}${bundle.css}</style></head><body><main id="app-content"><header><button data-shell-profile-trigger data-profile-name="Fixture User" data-profile-email="profile@example.test">Fixture User <span>profile@example.test</span></button></header><div id="root"></div></main></body></html>`);
    await page.evaluate((messages,box,folder)=>{window.messages=messages;window.box=box;window.folder=folder;},structuredClone(initialMessages),BOX,FOLDER);
    await page.evaluate(mockApi);await page.addScriptTag({content:bundle.code});
    await page.waitForSelector(`[data-mail-message-id="${A}"]`);await page.waitForFunction(()=>!document.querySelector('input[aria-label="Select all loaded messages"]').disabled);
    return {page,errors};
  }
  async function scenario(name, fn){await t.test(name,async()=>{const {page,errors}=await fixture();try{await fn(page);assert.deepEqual(errors,[]);}finally{await page.close();}});}
  try {
    await scenario('email click opens its reader, never profile; explicit profile trigger still works',async page=>{
      await page.click(`[data-mail-message-id="${A}"]`);await page.waitForSelector('[aria-label="Message reader"] h1');
      assert.equal(await page.$('[data-shell-profile-menu]'),null);assert.equal(await page.$eval('[aria-label="Message reader"] h1',el=>el.textContent),'Inbox A');
      await page.click('[data-shell-profile-trigger]');await page.waitForSelector('[data-shell-profile-menu]');assert.match(await page.$eval('[data-shell-profile-menu]',el=>el.textContent),/Fixture User/);
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('[data-shell-profile-menu]'));
    });
    await scenario('older saved draft restores every recipient and body, then saves and reopens',async page=>{
      await folderClick(page,3);await page.click(`[data-mail-message-id="${D}"]`);await page.waitForSelector('[data-mail-composer]');
      for(const [label,value]of [['To','customer@example.test'],['Cc','copy@example.test'],['Bcc','private@example.test'],['Subject','Older saved draft'],['Message','Existing draft body']])assert.equal(await page.$eval(`[aria-label="${label}"]`,el=>el.value),value);
      await page.type('textarea[aria-label="Message"]',' changed');await enabledClick(page,'[aria-label="Save draft and close"]');await page.waitForFunction(()=>!document.querySelector('[data-mail-composer]'));
      await page.click(`[data-mail-message-id="${D}"]`);await page.waitForSelector('[data-mail-composer]');assert.match(await page.$eval('[aria-label="Message"]',el=>el.value),/changed/);assert.equal(await page.evaluate(()=>window.messages.filter(m=>m.status==='draft').length),1);
    });
    await scenario('delete saved draft updates counts and retains a restorable copy in Trash',async page=>{
      await folderClick(page,3);await enabledClick(page,'[aria-label="Delete saved draft"]');await clickButton(page,'Move to Trash','dialog');await checkCount(page,'Drafts',0);await checkCount(page,'Trash',1);
      await page.waitForFunction(()=>!document.querySelector('dialog'));await folderClick(page,6);await page.click(`[data-mail-message-id="${D}"]`);await clickButton(page,'Restore');await checkCount(page,'Drafts',1);
    });
    await scenario('star and read/unread counts update and explicit unread stays unread',async page=>{
      await enabledClick(page,`[data-mail-message-id="${A}"] + div [aria-label="Star message"]`);await checkCount(page,'Starred',1);
      await page.click(`[data-mail-message-id="${A}"]`);await checkCount(page,'Inbox',1);await enabledClick(page,'[title="Mark as unread"]');await checkCount(page,'Inbox',2);
      await enabledClick(page,'[title="Mark as read"]');await checkCount(page,'Inbox',1);
      await enabledClick(page,`[data-mail-message-id="${A}"] + div [aria-label="Remove star"]`);await checkCount(page,'Starred',0);
    });
    await scenario('checkbox selection does not open or mark messages; batch Move moves both',async page=>{
      await page.click('[aria-label="Select all loaded messages"]');assert.equal(await page.$('[aria-label="Message reader"] h1'),null);await checkCount(page,'Inbox',2);
      await clickButton(page,'Move');await page.select('dialog select',FOLDER);await clickButton(page,'Move messages','dialog');await checkCount(page,'Inbox',0);
      assert.equal(await page.evaluate(()=>window.messages.filter(m=>m.folder==='custom').length),2);
    });
    await scenario('bulk partial failure keeps failed selection and does not repeat successful moves on retry',async page=>{
      await page.evaluate(id=>window.failIds=[id],B);await page.click('[aria-label="Select all loaded messages"]');await clickButton(page,'Move');await page.select('dialog select',FOLDER);await clickButton(page,'Move messages','dialog');
      await page.waitForSelector('dialog [role="alert"]');await page.evaluate(()=>window.failIds=[]);await clickButton(page,'Move messages','dialog');await checkCount(page,'Inbox',0);
      const counts=await page.evaluate(()=>window.requests.filter(r=>r.url==='/api/mail/organizer'&&r.method==='POST').map(r=>r.body.id));assert.equal(counts.filter(id=>id===A).length,1);assert.equal(counts.filter(id=>id===B).length,2);
    });
    await scenario('deleting an edited open draft flushes saves and cannot be resurrected by autosave',async page=>{
      await folderClick(page,3);await page.click(`[data-mail-message-id="${D}"]`);await page.waitForSelector('[data-mail-composer]');await page.type('[aria-label="Message"]',' saved before trash');
      await enabledClick(page,'[aria-label="Delete draft"]');await clickButton(page,'Move to Trash','dialog');await checkCount(page,'Drafts',0);
      await new Promise(resolve=>setTimeout(resolve,1200));assert.equal(await page.evaluate(id=>window.messages.find(m=>m.id===id).folder,D),'trash');assert.match(await page.evaluate(id=>window.messages.find(m=>m.id===id).text_body,D),/saved before trash/);
    });
    await scenario('clicking an already-open minimized draft restores the composer',async page=>{
      await folderClick(page,3);await page.click(`[data-mail-message-id="${D}"]`);await page.waitForSelector('[data-mail-composer]');await enabledClick(page,'[aria-label="Minimize composer"]');await page.click(`[data-mail-message-id="${D}"]`);await page.waitForSelector('textarea[aria-label="Message"]');assert.equal(await page.$eval('[data-mail-composer]',el=>el.dataset.minimized),'false');
    });
    await scenario('failed star action shows an error without a false count increase',async page=>{
      await page.evaluate(id=>window.failIds=[id],A);await enabledClick(page,`[data-mail-message-id="${A}"] + div [aria-label="Star message"]`);await page.waitForFunction(()=>document.body.textContent.includes('Fixture failure'));await checkCount(page,'Starred',0);
    });
  } finally {await browser.close();}
});
