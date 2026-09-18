(()=>{
'use strict';
const STORAGE='setu_pricing_v5_premium_review_v3';
const FEEDBACK='/api/public/pricing-v5-feedback';
const QUANTITY_BANDS=[
  ['500-999','500 – 999'],
  ['1000-1999','1,000 – 1,999'],
  ['2000-4999','2,000 – 4,999'],
  ['5000-9999','5,000 – 9,999'],
  ['10000-19999','10,000 – 19,999'],
  ['20000-49999','20,000 – 49,999'],
  ['50000-plus','50,000+']
];
const PRICING_GROUPS=[1,2,3,4,5].map(n=>[''+n,'Pricing Group '+n]);
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
function read(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}}
function write(s){try{localStorage.setItem(STORAGE,JSON.stringify(s))}catch(_){}}
function ownerSelections(){const s=read();if(!s.ownerBandSelections)s.ownerBandSelections={};return s}
function fieldLabel(select){const label=select.closest('label');if(label){const span=label.querySelector(':scope > span');if(span)return (span.textContent||'').trim();}const p=select.parentElement;return (p?.querySelector('label,span,b,small')?.textContent||'').trim()}
function setOptions(select,items,value){
  const current=value||select.value||'';
  select.innerHTML='<option value="">Select…</option>'+items.map(([v,l])=>'<option value="'+v+'"'+(String(v)===String(current)?' selected':'')+'>'+l+'</option>').join('');
}
async function post(step,text){try{await fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:step,rating:3,priority:'normal',feedback:text,page_path:location.pathname})})}catch(_){}}
function toast(text){let t=q('#pv5DropdownToast');if(!t){t=document.createElement('div');t.id='pv5DropdownToast';t.style.cssText='position:fixed;right:22px;bottom:22px;z-index:99999;background:#0b2b56;color:white;padding:11px 15px;border-radius:8px;box-shadow:0 8px 26px rgba(0,0,0,.18);font:600 12px system-ui';document.body.appendChild(t)}t.textContent=text;t.style.display='block';clearTimeout(t._timer);t._timer=setTimeout(()=>t.style.display='none',2200)}
function rowKey(select){const tr=select.closest('tr');if(tr){const first=tr.querySelector('td');if(first)return (first.textContent||'row').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')}const card=select.closest('.card,.owner-question,.panel');const title=card?.querySelector('h3,h4,b')?.textContent||'global';return title.trim().toLowerCase().replace(/[^a-z0-9]+/g,'-')}
function wire(select,type){if(select.dataset.pv5DropdownWired==='1')return;select.dataset.pv5DropdownWired='1';const key=rowKey(select);const state=ownerSelections();const storeKey=type+':'+key;const saved=state.ownerBandSelections[storeKey]||'';setOptions(select,type==='quantity'?QUANTITY_BANDS:PRICING_GROUPS,saved);select.disabled=false;select.style.pointerEvents='auto';select.style.cursor='pointer';select.addEventListener('change',async()=>{const s=ownerSelections();s.ownerBandSelections[storeKey]=select.value;write(s);const label=select.options[select.selectedIndex]?.text||select.value;if(select.value){toast(label+' saved for owner review');await post('owner-'+type+'-'+key,(type==='quantity'?'Quantity Band':'Commercial Bucket / Pricing Group')+' selected: '+label+'. This is a review decision only and does not activate production pricing.')}else{toast('Selection cleared')}})}
function inspect(){
  qa('#page select').forEach(select=>{
    const label=fieldLabel(select).toLowerCase();
    if(label.includes('quantity band')) wire(select,'quantity');
    if(label.includes('commercial bucket')||label.includes('pricing group')) wire(select,'group');
  });
  // Fallback for table/form layouts where the label is a sibling rather than wrapping label.
  qa('#page label,#page .field,#page th,#page td,#page div').forEach(node=>{
    const own=(node.childNodes.length?Array.from(node.childNodes).filter(n=>n.nodeType===Node.TEXT_NODE).map(n=>n.textContent).join(' '):node.textContent||'').trim().toLowerCase();
    if(!own)return;
    const select=node.querySelector?.('select')||node.nextElementSibling?.querySelector?.('select')||(node.nextElementSibling?.tagName==='SELECT'?node.nextElementSibling:null);
    if(!select)return;
    if(own.includes('quantity band')) wire(select,'quantity');
    if(own.includes('commercial bucket')||own.includes('pricing group')) wire(select,'group');
  });
}
let inspectTimer=null;
function scheduleInspect(delay=50){if(inspectTimer)clearTimeout(inspectTimer);inspectTimer=setTimeout(()=>{inspectTimer=null;inspect()},delay)}
const obs=new MutationObserver(()=>scheduleInspect());
function start(){inspect();const p=q('#page');if(p)obs.observe(p,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleInspect(0)})}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();