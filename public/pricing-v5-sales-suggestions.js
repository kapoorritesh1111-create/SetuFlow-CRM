(()=>{
'use strict';
const API='/api/public/pricing-v5-review-preview';
let timer=null,lastKey='';
const q=(s,r=document)=>r.querySelector(s);
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
function onPage(){return /Sales Quote/i.test(q('#page .page-head h2')?.textContent||'')}
async function run(){
  if(!onPage())return;
  const host=q('#salesQuantitySuggestions'),size=q('#salesSize'),construction=q('#salesCon'),qty=q('#salesQty'),print=q('#salesPrint'),zip=q('#salesZip');
  if(!host||!size||!construction||!qty)return;
  const currentQty=Math.max(1,Math.floor(Number(qty.value)||5000));
  const key=[size.value,construction.value,currentQty,print?.value,zip?.value].join('|');
  if(key===lastKey)return;lastKey=key;
  host.innerHTML='<div class="better"><span class="metric-icon">◇</span><div><small>Quantity Availability</small><strong>Loading live options…</strong><em class="green-t">Engine-backed producible quantities only</em></div></div>';
  try{
    const cat=await fetch(API,{cache:'no-store'}).then(r=>r.json());
    const selected_charge_codes=[];
    if(zip?.value==='yes'){
      const zipper=(cat.charges||[]).find(x=>/zipper/i.test(String(x.code||'')+' '+String(x.name||'')));
      if(zipper?.code)selected_charge_codes.push(zipper.code);
    }
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size_profile_id:size.value,construction_id:construction.value,quantity:currentQty,print:print?.value||'CMYKW',selected_charge_codes}),cache:'no-store'});
    const b=await r.json();
    if(!r.ok||!b.ok)throw new Error(b.error||'Unable to calculate pricing');
    const current=Number(b.result?.selling_price?.unit_price);
    const alternatives=(b.result?.alternative_quantities||[])
      .map(x=>({quantity:Number(x.quantity),unit_price:Number(x.unit_price)}))
      .filter(x=>Number.isFinite(x.quantity)&&Number.isFinite(x.unit_price)&&x.quantity>currentQty)
      .slice(0,3);
    const cards=['<div class="better"><span class="metric-icon">◇</span><div><small>Quantity Availability</small><strong>Size-specific</strong><em class="green-t">N/A quantities are excluded automatically</em></div></div>'];
    for(const x of alternatives){
      const save=Number.isFinite(current)&&current>0?current-x.unit_price:0;
      const pct=Number.isFinite(current)&&current>0?(save/current)*100:0;
      cards.push('<div class="better"><span class="metric-icon green">↗</span><div><small>Better Price at '+x.quantity.toLocaleString()+' pcs</small><strong>'+money(x.unit_price)+' / pc</strong><em class="green-t">'+(save>0?'↓ Save '+money(save)+' / pc ('+pct.toFixed(1)+'%)':'Higher quantity option')+'</em></div></div>');
    }
    if(!alternatives.length)cards.push('<div class="better"><span class="metric-icon">✓</span><div><small>Higher Quantity Options</small><strong>No higher producible quantity available</strong><em>Current quantity is the highest available ladder point</em></div></div>');
    host.innerHTML=cards.join('');
  }catch(e){
    host.innerHTML='<div class="better"><span class="metric-icon">△</span><div><small>Quantity Suggestions</small><strong>Live pricing unavailable</strong><em>'+String(e.message||e)+'</em></div></div>';
  }
}
function schedule(){if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;run()},100)}
function wire(){
  ['#salesSize','#salesCon','#salesPrint','#salesZip','#salesQty'].forEach(s=>{const el=q(s);if(el&&el.dataset.pv5SuggestWired!=='1'){el.dataset.pv5SuggestWired='1';el.addEventListener(el.tagName==='INPUT'?'input':'change',()=>{lastKey='';schedule()})}});
}
function tick(){if(!onPage())return;wire();run()}
function init(){new MutationObserver(()=>schedule()).observe(document.documentElement,{childList:true,subtree:true});tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();