(()=>{
'use strict';
const API='/api/public/pricing-v5-frame-family-review';
const STORAGE='setu_pricing_v5_selected_family_v1';
const FAMILIES=[
 ['sup','Stand Up Pouches',null],
 ['center_seal_roll','Center Seal — Roll Form','stark-center-seal-roll-v5-review'],
 ['center_seal_pouch','Center Seal — Pouch Form','stark-center-seal-pouch-v5-review'],
 ['three_side_seal_roll','3 Side Seal — Roll Form','stark-3ss-roll-v5-review'],
 ['three_side_seal_pouch','3 Side Seal — Pouch Form','stark-3ss-pouch-v5-review'],
 ];
let metadata=null,lastSignature='';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
function selected(){try{return localStorage.getItem(STORAGE)||'sup'}catch(_){return'sup'}}
function saveSelected(v){try{localStorage.setItem(STORAGE,v)}catch(_){}}
function fam(key=selected()){return FAMILIES.find(x=>x[0]===key)||FAMILIES[0]}
function pageTitle(){return q('#page .page-head h2')?.textContent?.trim()||q('#page h2')?.textContent?.trim()||''}
function labelOf(select){const l=select.closest('label');const s=l?.querySelector(':scope > span');return (s?.textContent||l?.textContent||'').trim().toLowerCase()}
function populateFamilySelects(){
 qa('#page select').forEach(s=>{
   const label=labelOf(s);if(!label.includes('packaging family'))return;
   const cur=selected();const signature=FAMILIES.map(f=>f[0]).join('|');
   if(s.dataset.familyOptions!==signature){s.innerHTML=FAMILIES.map(f=>'<option value="'+f[0]+'">'+f[1]+'</option>').join('');s.dataset.familyOptions=signature}
   if([...s.options].some(o=>o.value===cur))s.value=cur;
   if(s.dataset.familyContextWired!=='1'){
     s.dataset.familyContextWired='1';s.disabled=false;s.style.pointerEvents='auto';
     s.addEventListener('change',()=>{saveSelected(s.value);lastSignature='';renderContext(true);});
   }
 });
}
function metaFor(key){const f=fam(key);return metadata?.families?.find(x=>x.template_slug===f[2])||null}
function removeContext(){q('#pv5FamilyContext')?.remove();qa('[data-pv5-sup-only-hidden]').forEach(el=>{el.style.display=el.dataset.pv5OldDisplay||'';delete el.dataset.pv5SupOnlyHidden;});}
function hideSupOnly(){
 const title=pageTitle();
 if(/Waste/i.test(title))qa('.metric-grid,.card').forEach(el=>{const t=el.textContent||'';if(/Quantity Buckets|Impact Preview|What to change if prices are too high/i.test(t))hide(el)});
 if(/Sizes|Constructions/i.test(title))qa('#page > .metric-grid,#page > .filters,#page > .construction-layout,#page > .sizes-bottom,#page > .card.section').forEach(hide);
 if(/Competitor/i.test(title))qa('#page > .competitor-filters,#page > .competitor-metrics,#page > .competitor-layout').forEach(hide);
 if(/Pricing Dashboard|Price Matrix|Sales Quote/i.test(title))qa('.dashboard-main,.matrix-card,.sales-layout,.quote-layout,.step-strip').forEach(hide);
 function hide(el){if(!el||el.id==='pv5FamilyContext'||el.dataset.pv5SupOnlyHidden)return;el.dataset.pv5OldDisplay=el.style.display||'';el.dataset.pv5SupOnlyHidden='1';el.style.display='none'}
}
function renderContext(force=false){
 populateFamilySelects();const key=selected(),sig=pageTitle()+'|'+key;
 if(!force&&sig===lastSignature&&((key==='sup'&&!q('#pv5FamilyContext'))||(key!=='sup'&&q('#pv5FamilyContext'))))return;
 lastSignature=sig;removeContext();if(key==='sup')return;
 hideSupOnly();const page=q('#page');if(!page)return;const f=fam(key),m=metaFor(key);const section=document.createElement('section');section.id='pv5FamilyContext';section.className='card section';
 if(!m){section.innerHTML='<div class="notice warn">Loading '+esc(f[1])+' review data…</div>';insert(section);return}
 const cons=m.constructions||[],sizes=m.sizes||[];
 const sizeControl=sizes.length
   ? '<select id="pv5CtxSize">'+sizes.map(s=>'<option value="'+s.width_mm+'x'+s.height_mm+'">'+s.width_mm+' × '+s.height_mm+' mm</option>').join('')+'</select>'
   : '<div class="pv5-size-pair"><input id="pv5CtxWidth" type="number" min="1" placeholder="Width mm"><span>×</span><input id="pv5CtxHeight" type="number" min="1" placeholder="Height mm"></div>';
 section.innerHTML='<div class="panel-title"><div><h3>'+esc(f[1])+' — Pricing v5 Review Context</h3><span>This family is review-only and inactive. Nothing here changes live pricing.</span></div><span class="pill amber">Owner Review Required</span></div>'+scopeMessage()+'<div class="pv5-context-grid">'+
 field('Construction','<select id="pv5CtxConstruction">'+cons.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.name)+'</option>').join('')+'</select>')+
 field('Size (mm)',sizeControl+(sizes.length?'':'<small>Enter the production width and height from the family workbook / owner review.</small>'))+
 field('Quantity (pcs)','<input id="pv5CtxQty" type="number" min="1" value="5000">')+
 field('Commercial Bucket','<select id="pv5CtxBucket"><option value="">Select — owner confirmation required</option><option value="1">Bucket 1</option><option value="2">Bucket 2</option><option value="3">Bucket 3</option><option value="4">Bucket 4</option><option value="5">Bucket 5</option></select>')+
 '</div><div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn primary" id="pv5CtxRun">Run v4 vs v5 Review</button><button class="btn outline" id="pv5CtxQuestion">Clarify Bucket / Geometry</button></div><div id="pv5CtxResult"></div>';
 insert(section);q('#pv5CtxRun')?.addEventListener('click',run);q('#pv5CtxQuestion')?.addEventListener('click',()=>window.PV5PremiumInteractions?.goClarification?.(5));
}
function scopeMessage(){const t=pageTitle();if(/Waste/i.test(t))return'<div class="notice warn"><b>Family-specific commercial rules.</b> Stand-Up Pouch quantity bands are not automatically approved for this family. Center Seal and 3SS require owner-confirmed run-length → commercial-bucket mapping. Test a proposed bucket below; no mapping is assumed.</div>';if(/Constructions/i.test(t))return'<div class="notice info"><b>Family constructions loaded from the migration baseline.</b> Review the selected construction and resulting v5 price before approval.</div>';if(/Rates/i.test(t))return'<div class="notice info"><b>Rates use shared Cost Master inputs.</b> Family geometry and process usage determine the resulting price.</div>';if(/Sales Quote/i.test(t))return'<div class="notice warn"><b>Sales quoting remains blocked for this family.</b> This calculator is owner-review only until family rules and commercial mapping are approved.</div>';return'<div class="notice info"><b>Family-specific review.</b> Stand-Up Pouch pricing content is hidden while this family is selected so it cannot be mistaken for '+esc(fam()[1])+' pricing.</div>'}
function field(label,html){return'<label class="field"><span>'+esc(label)+'</span>'+html+'</label>'}
function insert(section){const banner=q('#page .owner-review-baseline-banner');const head=q('#page .page-head');(banner||head)?.insertAdjacentElement('afterend',section);style()}
function dimensions(){const select=q('#pv5CtxSize');if(select){const p=String(select.value||'').split('x').map(Number);return p.length===2&&p.every(n=>n>0)?p:null}const w=Number(q('#pv5CtxWidth')?.value||0),h=Number(q('#pv5CtxHeight')?.value||0);return w>0&&h>0?[w,h]:null}
async function run(){const f=fam(),m=metaFor(f[0]),out=q('#pv5CtxResult'),sz=dimensions(),construction=q('#pv5CtxConstruction')?.value,qty=Number(q('#pv5CtxQty')?.value||0),bucket=q('#pv5CtxBucket')?.value;if(!sz){out.innerHTML='<div class="notice warn" style="margin-top:12px">Enter or select a valid width and height.</div>';return}if(!construction){out.innerHTML='<div class="notice warn" style="margin-top:12px">Select a construction.</div>';return}if(!bucket){out.innerHTML='<div class="notice warn" style="margin-top:12px">Select a proposed commercial bucket or use the clarification button. The system will not assume one.</div>';return}out.innerHTML='<div class="notice info" style="margin-top:12px">Calculating v4 baseline vs Pricing v5…</div>';try{const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({template_slug:m.template_slug,width_mm:sz[0],height_mm:sz[1],construction_id:construction,quantity:qty,commercial_bucket:Number(bucket),print:'CMYK'})});const b=await r.json();if(!r.ok||b.ok===false)throw new Error(b.error||'Comparison unavailable');const c=b.comparison||{},x=b.result||{},cb=x.cost_breakdown||{};out.innerHTML='<div class="pv5-context-results"><div><small>v4 Baseline</small><b>'+money(c.v4_unit_price)+'</b><span>/ piece</span></div><div><small>Pricing v5</small><b>'+money(c.v5_unit_price)+'</b><span>/ piece</span></div><div><small>Difference</small><b>'+money(c.difference_per_unit)+'</b><span>'+(Number.isFinite(Number(c.difference_pct))?Number(c.difference_pct).toFixed(2)+'%':'—')+'</span></div><div><small>Run Length</small><b>'+Number(x.run_length_m||0).toFixed(2)+' m</b><span>Bucket '+(x.commercial_bucket||'—')+'</span></div></div><div class="pv5-context-breakdown"><span>Material '+money(cb.material_per_frame)+'</span><span>Adhesive '+money(cb.adhesive_per_frame)+'</span><span>Process '+money(cb.process_per_frame)+'</span><span>Waste '+money(cb.wastage_per_frame)+'</span><span>Margin '+money(cb.margin_per_frame)+'</span></div>'}catch(e){out.innerHTML='<div class="notice block" style="margin-top:12px">'+esc(e.message||e)+'</div>'}}
function style(){if(q('#pv5FamilyContextStyle'))return;const s=document.createElement('style');s.id='pv5FamilyContextStyle';s.textContent='.pv5-context-grid{display:grid;grid-template-columns:2fr 1.2fr 1fr 1fr;gap:10px;margin-top:14px}.pv5-size-pair{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:6px}.pv5-context-results{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.pv5-context-results>div{border:1px solid #dbe7f5;border-radius:12px;padding:12px;background:#f8fbff}.pv5-context-results small,.pv5-context-results span{display:block;color:#607995}.pv5-context-results b{display:block;font-size:22px;color:#0b2f63;margin:3px 0}.pv5-context-breakdown{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.pv5-context-breakdown span{background:#f5f8fc;border:1px solid #dde8f4;border-radius:999px;padding:6px 10px;font-size:11px}@media(max-width:1000px){.pv5-context-grid,.pv5-context-results{grid-template-columns:1fr 1fr}}';document.head.appendChild(s)}
async function init(){try{const r=await fetch(API,{cache:'no-store'});const b=await r.json();if(r.ok&&b.ok!==false)metadata=b}catch(_){}const tick=()=>{populateFamilySelects();renderContext(false)};tick();new MutationObserver(()=>setTimeout(tick,60)).observe(document.documentElement,{subtree:true,childList:true})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();