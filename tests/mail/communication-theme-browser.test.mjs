import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const esbuild = require('esbuild');

function loadTs(file) {
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, { module, exports: module.exports, require });
  return module.exports;
}
const entry = `
import React from 'react'; import { createRoot } from 'react-dom/client';
import { MobileSetuMailWorkspace } from './src/features/mail/components/mobile-setu-mail-workspace';
import { MobileCalendarWorkspace } from './src/features/calendar/components/mobile-calendar-workspace';
import { CalendarSettingsWorkspace } from './src/features/calendar/components/calendar-settings-workspace';
import { MobilePeopleWorkspace } from './src/features/contacts/components/mobile-people-workspace';
import { MailProductShell } from './src/components/layout/mail-product-shell';
import { setThemePreference } from './src/lib/theme';
window.setFixtureTheme = setThemePreference;
const view = new URLSearchParams(location.search).get('view');
const props = { userName:'Fixture User', userEmail:'sales@example.test', organizationName:'Fixture' };
const content = view==='settings' ? <CalendarSettingsWorkspace/> : view==='calendar' ? <MobileCalendarWorkspace/> : view==='people' ? <MobilePeopleWorkspace/> : <MobileSetuMailWorkspace {...props}/>;
createRoot(document.getElementById('root')).render(<MailProductShell profileName="Fixture User" profileEmail="sales@example.test" organizationName="Fixture" organizationId="org-test" userId="user-test">{content}</MailProductShell>);
`;
function fixtureApi() {
  const BOX='22222222-2222-4222-8222-222222222222';
  const msg={id:'11111111-1111-4111-8111-111111111111',thread_id:null,from_address:'buyer@example.test',to_addresses:['sales@example.test'],cc_addresses:[],bcc_addresses:[],subject:'Theme test',text_body:'Please review the updated quote.',created_at:new Date().toISOString(),is_read:false,is_starred:false,status:'received',folder:'inbox',direction:'inbound'};
  const counts={inbox:1,sent:0,drafts:0,starred:0,archive:0,junk:0,trash:0};
  const event={id:'33333333-3333-4333-8333-333333333333',title:'Design review',starts_at:new Date().toISOString(),ends_at:new Date(Date.now()+3600000).toISOString(),timezone:'America/New_York',meeting_provider:'none',calendar_attendees:[],calendar_reminders:[]};
  window.fetch=async input=>{
    const url=new URL(input,location.origin);let data={};
    if(url.pathname==='/api/mail')data={mailbox:{id:BOX,address:'sales@example.test'},messages:[msg],attachments:[],signature:null,counts,providerReady:true,inboundReady:true};
    else if(url.pathname==='/api/mail/search')data={messages:[msg],attachments:[],nextCursor:null};
    else if(url.pathname==='/api/mail/organizer')data={mailboxId:BOX,folders:[],rules:[],canManage:true,canMove:true};
    else if(url.pathname==='/api/mail/active-mailbox')data={activeMailboxId:BOX,crmEnabled:true,unreadMailCount:1,mailboxes:[{id:BOX,address:'sales@example.test',can_read:true,can_send:true,can_manage:true,is_primary:true}]};
    else if(url.pathname==='/api/calendar')data={events:[event]};
    else if(url.pathname==='/api/calendar/availability')data={availability:[1,2,3,4,5].map(weekday=>({weekday,start_time:'09:00',end_time:'17:00',is_active:true,timezone:'America/New_York'}))};
    else if(url.pathname==='/api/calendar/preferences')data={preferences:{timezone:'America/New_York',defaultReminderMinutes:15,defaultReminderChannels:['in_app']},communications:{enabled:true,canManage:true}};
    else if(url.pathname==='/api/calendar/zoom')data={configured:false,connected:false};
    else if(url.pathname==='/api/contacts')data={contacts:[{id:'person-1',first_name:'Alex',last_name:'Morgan',email:'alex@example.test',relationship_type:'buyer',company:'Example Imports'}]};
    return Response.json(data);
  };
  const chain={update(){return this;},eq(){return this;},in(){return this;},then(resolve,reject){return Promise.resolve({data:[],error:null}).then(resolve,reject);}};
  window.fixtureDb={auth:{onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},from:()=>chain,rpc:async()=>({data:{items:[],unreadCount:0,timezone:'America/New_York'},error:null})};
}

async function contrast(page, selector) {
  const colors=await page.$eval(selector, el=>{
    const color=getComputedStyle(el).color;let bg='rgb(255, 255, 255)';
    for(let node=el;node;node=node.parentElement){const candidate=getComputedStyle(node).backgroundColor;if(candidate.startsWith('rgb(')){bg=candidate;break;}}
    return {color,bg};
  });
  const lum=value=>{const rgb=value.match(/[\d.]+/g).slice(0,3).map(Number).map(n=>n/255).map(n=>n<=0.04045?n/12.92:((n+0.055)/1.055)**2.4);return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;};
  const a=lum(colors.color),b=lum(colors.bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);
  assert.ok(ratio>=4.5, `${selector}: contrast ${ratio.toFixed(2)} (${JSON.stringify(colors)})`);
}

test('mobile theme renders real communications components with readable light/dark native controls', {timeout:120000}, async t=>{
  const out=fs.mkdtempSync(path.join(os.tmpdir(),'setu-theme-'));
  const evidence=path.resolve('artifacts/communication-theme'); fs.mkdirSync(evidence,{recursive:true});
  const bundle=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),loader:'tsx'},bundle:true,jsx:'automatic',write:false,outdir:out,platform:'browser',format:'iife',define:{'process.env':JSON.stringify({NODE_ENV:'production'})},plugins:[{name:'fixture-boundaries',setup(build){
    build.onResolve({filter:/^(next\/(navigation|link)|@\/lib\/supabase\/client)$/},args=>({path:args.path,namespace:'fixture'}));
    build.onLoad({filter:/.*/,namespace:'fixture'},args=>({loader:'js',resolveDir:process.cwd(),contents:args.path==='next/link'?`import React from 'react';export default function Link(props){return React.createElement('a',props,props.children);}`:args.path==='next/navigation'?`import {useMemo} from 'react';export const usePathname=()=>location.pathname;export const useSearchParams=()=>useMemo(()=>new URLSearchParams(location.search),[]);export const useRouter=()=>({push:url=>location.assign(url),refresh(){}});`:`export const createClient=()=>window.fixtureDb;` }));
  }}]});
  const js=bundle.outputFiles.find(file=>file.path.endsWith('.js')).text;
  const moduleCss=bundle.outputFiles.filter(file=>file.path.endsWith('.css')).map(file=>file.text).join('\n');
  const config=loadTs('tailwind.config.ts').default;
  const css=(await require('postcss')([require('tailwindcss')(config)]).process('@tailwind base; @tailwind components; @tailwind utilities;',{from:undefined})).css;
  const init=loadTs('src/lib/theme.ts').THEME_INIT_SCRIPT;
  const server=http.createServer((req,res)=>{
    res.setHeader('Content-Type','text/html');
    res.end(`<html><head><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#193769"><style>${fs.readFileSync('src/app/design-tokens.css','utf8')}${css}${moduleCss}body{margin:0;font-family:Arial,sans-serif;background:var(--sf-bg-app);color:var(--sf-text-primary)}</style><script>localStorage.setItem('setuflow-theme','system');${init}</script></head><body><div id="root"></div><script>(${fixtureApi.toString()})();</script><script>${js.replace(/<\/script/gi,'<\\/script')}</script></body></html>`);
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin=`http://127.0.0.1:${server.address().port}`;
  const chromiumModule=require('@sparticuz/chromium'),chromium=chromiumModule.default??chromiumModule;
  const browser=await require('puppeteer-core').launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:'shell',defaultViewport:{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:1}});
  async function pageFor(route,view){const page=await browser.newPage();page.setDefaultTimeout(10000);page.on('pageerror',error=>console.error('Theme fixture error:',error.message));await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);await page.goto(`${origin}${route}?view=${view}`,{waitUntil:'networkidle0'});await page.screenshot({path:path.join(evidence,view+'-initial.png')});return page;}
  try{
    await t.test('dark inbox, search, folders and bottom tabs are readable and interactive',async()=>{
      const page=await pageFor('/mail','mail');
      try{
        await page.waitForSelector('[aria-label="Search mail"]');
        assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'dark');
        await contrast(page,'[aria-label="Search mail"]');
        await contrast(page,'nav[aria-label="SETU Mail mobile navigation"] a');
        await page.click('[aria-label="Search mail"]');await page.waitForSelector('[aria-label="Search entire mailbox"]');await contrast(page,'[aria-label="Search entire mailbox"]');
        await page.screenshot({path:path.join(evidence,'mail-dark.png')});
        await page.click('[aria-label="Open mail folders and accounts"]');await page.waitForSelector('dialog[open][aria-label="Mail folders"]');
        await contrast(page,'[aria-label="Open Inbox folder"]');await page.screenshot({path:path.join(evidence,'folders-dark.png')});
        await page.click('[aria-label="Close Mail folders"]');
        await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
        await contrast(page,'[aria-label="Search mail"]');await page.screenshot({path:path.join(evidence,'mail-light.png')});
      }finally{await page.close();}
    });
    await t.test('working hours keep their values and contrast when the OS theme changes',async()=>{
      const page=await pageFor('/calendar/settings','settings');
      try{
        await page.waitForSelector('[aria-label="Monday start time"]');
        await contrast(page,'[aria-label="Monday start time"]');await contrast(page,'input[list="calendar-timezones"]');
        assert.equal(await page.$eval('[aria-label="Monday start time"]',el=>el.value),'09:00');
        await page.screenshot({path:path.join(evidence,'calendar-settings-dark.png'),fullPage:true});
        await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'light'}]);await page.waitForFunction(()=>!document.documentElement.classList.contains('dark'));
        await contrast(page,'[aria-label="Monday start time"]');assert.equal(await page.$eval('[aria-label="Monday end time"]',el=>el.value),'17:00');
        await page.screenshot({path:path.join(evidence,'calendar-settings-light.png'),fullPage:true});
        await page.evaluate(()=>window.setFixtureTheme('light'));await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}]);
        assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).colorScheme),'light');await contrast(page,'[aria-label="Monday start time"]');
      }finally{await page.close();}
    });
    await t.test('calendar and People keep Setu colors in device dark mode',async()=>{
      for(const [route,view,selector]of [['/calendar','calendar','[aria-label="Search calendar"]'],['/contacts','people','[aria-label="Search people"]']]){
        const page=await pageFor(route,view);try{await page.waitForSelector(selector);await contrast(page,selector);await page.screenshot({path:path.join(evidence,`${view}-dark.png`)});}finally{await page.close();}
      }
    });
  }finally{await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(out,{recursive:true,force:true});}
});
