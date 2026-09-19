(()=>{
'use strict';
const API='/api/public/pricing-v5-review-preview';
const STATE='/api/public/pricing-v5-owner-review-state';
const Q=[1000,2000,3000,5000,10000,20000,30000,50000];
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
let catalog=null,generation=0,matrixGeneration=0,timer=null,lastKey='',currentResult=null,currentPayload=null;
function onPage(){return /Sales Quote/i.test(q('#page .page-head h2')?.textContent||'')}
async function getCatalog(){if(catalog)return catalog;const r=await fetch(API,{cache:'no-store'}),b=await r.json();if(!r.ok||!b.ok)throw new Error(b.error||'Pricing catalog unavailable');catalog=b;return b}
function size(){return q('#salesSize')}
function con(){return q('#salesCon')}
function qty(){return q('#salesQty')}
function print(){return q('#salesPrint')}
function zip(){return q('#salesZip')}
function gusset(){return q('#salesBottomGusset')}
function selectedSize(){return (catalog?.sizes||[]).find(x=>String(x.id)===String(size()?.value))}
function selectedConstruction(){return (catalog?.constructions||[]).find(x=>String(x.id)===String(con()?.value))}
function selectedCharges(){if(zip()?.value!=='yes')return[];const z=(catalog?.charges||[]).find(x=>/zipper/i.test(String(x.code||'')+' '+String(x.name||'')));return z?.code?[z.code]:[]}
function statusHost(){
 let h=q('#salesQuoteStatus');
 if(!h){const config=q('.sales-config');if(config){h=document.createElement('div');h.id='salesQuoteStatus';h.className='notice info';h.style.margin='0 16px 12px';config.insertAdjacentElement('afterend',h)}}
 return h;
}
function showStatus(text,kind='info'){const h=statusHost();if(h){h.className='notice '+kind;h.innerHTML=text}}
function ensureGusset(){
 const s=selectedSize(),zipLabel=zip()?.closest('label.field');if(!zipLabel)return;
 let field=q('#salesBottomGusset')?.closest('label.field');
 const conditional=s?.route==='conditional'||s?.bottom_registration_mode==='optional';
 if(!conditional){field?.remove();return}
 if(!field){
  field=document.createElement('label');field.className='field';field.innerHTML='<span>Bottom Gusset *</span><select id="salesBottomGusset"><option value="solid_unregistered">Unregistered / solid color</option><option value="registered_artwork">Registered / logo-text-artwork</option></select><small>Required for this size</small>';
  zipLabel.insertAdjacentElement('afterend',field);
 }
}
function ensureQuantityControl(){
 const s=selectedSize(),el=qty();if(!el||el.tagName==='SELECT')return;
 const blocked=(s?.blocked_quantities||[]).map(Number),allowed=Array.isArray(s?.allowed_quantities)&&s.allowed_quantities.length?s.allowed_quantities.map(Number):Q;
 const values=allowed.filter(x=>!blocked.includes(x));
 const select=document.createElement('select');select.id='salesQty';select.innerHTML=values.map(x=>'<option value="'+x+'" '+(x===5000?'selected':'')+'>'+x.toLocaleString()+'</option>').join('');
 el.replaceWith(select);
}
async function refreshConstructionOptions(preserve=true){
 const mg=++matrixGeneration,c=await getCatalog(),s=size()?.value;if(!s)return;
 const prev=preserve?con()?.value:'';
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size_matrix:true,size_profile_id:s,print:print()?.value||'CMYKW',selected_charge_codes:selectedCharges(),bottom_print_mode:gusset()?.value||undefined}),cache:'no-store'}),b=await r.json();
 if(!r.ok||!b.ok)throw new Error(b.error||'Compatible constructions unavailable');
 if(mg!==matrixGeneration||String(size()?.value)!==String(s))return false;
 const valid=new Set((b.rows||[]).map(x=>String(x.construction_id)));
 const options=(c.constructions||[]).filter(x=>valid.has(String(x.id)));
 if(!con())return;
 con().innerHTML=options.map(x=>'<option value="'+esc(x.id)+'">'+esc((x.display_name||x.name)+(x.layer_stack?' — '+x.layer_stack:''))+'</option>').join('');
 if(prev&&valid.has(String(prev)))con().value=prev;
 return true;
}
function breakdown(result){
 const host=q('#salesBreakdown');if(!host)return;
 const x=result?.cost_breakdown?.per_unit||{}, final=Number(x.final_price||result?.selling_price?.unit_price||0);
 const rows=[
  ['Material',x.material_cost],['Printing',x.printing_cost],['Lamination',x.lamination_cost],['Slitting',x.slitting_cost],['Pouch making',x.pouch_making_cost],['Zipper',x.zipper_cost],['Waste',x.waste_cost],['Margin',x.margin_cost]
 ].filter(([,v])=>Number(v)>0);
 host.innerHTML=rows.map(([name,v])=>'<div><small>'+name+'</small><strong>'+money(v)+(final>0?' ('+(Number(v)/final*100).toFixed(1)+'%)':'')+'</strong></div>').join('')+'<div class="notice info">ⓘ Owner-review breakdown is engine-backed. Sales/customer payloads remain redacted.</div>';
}
function suggestions(result,currentQty){
 const host=q('#salesQuantitySuggestions');if(!host)return;
 const cur=Number(result?.selling_price?.unit_price);
 const alt=(result?.alternative_quantities||[]).map(x=>({quantity:Number(x.quantity),unit_price:Number(x.unit_price)})).filter(x=>x.quantity>currentQty&&Number.isFinite(x.unit_price)).slice(0,3);
 const cards=['<div class="better"><span class="metric-icon">◇</span><div><small>Requested Quantity</small><strong>'+currentQty.toLocaleString()+' pcs</strong><em class="green-t">Only producible higher quantities are shown</em></div></div>'];
 for(const x of alt){const save=cur-x.unit_price,pct=cur>0?save/cur*100:0;cards.push('<div class="better"><span class="metric-icon green">↗</span><div><small>'+x.quantity.toLocaleString()+' pcs</small><strong>'+money(x.unit_price)+' / pc</strong><em class="green-t">'+(save>0?'Save '+money(save)+' / pc ('+pct.toFixed(1)+'%)':'Higher quantity option')+'</em></div></div>')}
 if(!alt.length)cards.push('<div class="better"><span class="metric-icon">✓</span><div><small>Higher Quantity Options</small><strong>No higher producible quantity</strong><em>Current quantity is the highest available option</em></div></div>');
 host.innerHTML=cards.join('');
}
function updateSummary(result){
 const unit=Number(result?.selling_price?.unit_price),product=Number(result?.selling_price?.product_total),gst=Number(result?.selling_price?.gst),grand=Number(result?.selling_price?.grand_total_before_freight??result?.selling_price?.grand_total);
 if(q('#salesUnit'))q('#salesUnit').innerHTML=money(unit)+' <span>/ pc</span>';
 if(q('#salesTotal'))q('#salesTotal').textContent=money(product);
 if(q('#salesGst'))q('#salesGst').textContent=money(gst);
 if(q('#salesGrand'))q('#salesGrand').textContent=money(grand);
 if(q('#estimatedTotal'))q('#estimatedTotal').textContent=money(grand);
 const ps=q('.product-line');if(ps){const s=selectedSize(),c=selectedConstruction();const span=q('span',ps),small=q('small',ps),strong=q('strong',ps);if(span)span.textContent=(s?s.width_mm+' × '+s.height_mm:'—')+' | '+(c?.display_name||c?.name||'—');if(small)small.textContent='Qty: '+Number(qty()?.value||0).toLocaleString()+' pcs';if(strong)strong.textContent=money(grand)}
 breakdown(result);suggestions(result,Number(qty()?.value||0));
}
async function calculate(){
 if(!onPage())return;
 const gen=++generation;await getCatalog();ensureGusset();ensureQuantityControl();
 const payload={size_profile_id:size()?.value,construction_id:con()?.value,quantity:Number(qty()?.value||0),print:print()?.value||'CMYKW',selected_charge_codes:selectedCharges(),bottom_print_mode:gusset()?.value||undefined};
 if(!payload.size_profile_id||!payload.construction_id||!payload.quantity)return;
 const key=JSON.stringify(payload);lastKey=key;showStatus('<b>Calculating live Pricing v5 quote…</b>');
 try{
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),cache:'no-store'}),b=await r.json();
  if(gen!==generation)return;
  if(!r.ok||!b.ok)throw new Error((b.review_details?.validation_errors||[]).join(' ')||b.error||'Quote calculation failed');
  currentResult=b.result;currentPayload=payload;updateSummary(b.result);const save=q('#salesSaveReview'),cont=q('#salesContinueReview');if(save)save.disabled=false;if(cont)cont.disabled=false;
  showStatus('<b>✓ Live Pricing v5 quote calculated.</b> '+esc(selectedSize()?.name||'')+' · '+Number(payload.quantity).toLocaleString()+' pcs','success');
 }catch(e){if(gen!==generation)return;currentResult=null;currentPayload=null;showStatus('<b>Quote cannot be calculated:</b> '+esc(e.message||e),'warn');['#salesUnit','#salesTotal','#salesGst','#salesGrand','#estimatedTotal'].forEach(s=>{if(q(s))q(s).textContent='—'});}
}
async function sizeChanged(){
 invalidateQuote();matrixGeneration++;await getCatalog();ensureGusset();
 const old=qty()?.value;
 if(qty()&&qty().tagName==='SELECT'){const s=selectedSize(),blocked=(s?.blocked_quantities||[]).map(Number),allowed=Array.isArray(s?.allowed_quantities)&&s.allowed_quantities.length?s.allowed_quantities.map(Number):Q;qty().innerHTML=allowed.filter(x=>!blocked.includes(x)).map(x=>'<option value="'+x+'">'+x.toLocaleString()+'</option>').join('');if([...qty().options].some(o=>o.value===old))qty().value=old;else qty().value='5000'}
 const applied=await refreshConstructionOptions(false);if(applied!==false)calculate();
}
function invalidateQuote(){generation++;currentResult=null;currentPayload=null;const save=q('#salesSaveReview'),cont=q('#salesContinueReview');if(save)save.disabled=true;if(cont)cont.disabled=true;showStatus('<b>Refreshing quote for the new selection…</b>')}
function schedule(){invalidateQuote();if(timer)clearTimeout(timer);timer=setTimeout(()=>{timer=null;calculate()},80)}
async function saveSnapshot(){
 if(!currentResult||!currentPayload)return alert('Calculate a valid quote first.');
 const key='sales-quote-review:'+currentPayload.size_profile_id+':'+currentPayload.construction_id+':'+currentPayload.quantity;
 const value={...currentPayload,unit_price:currentResult.selling_price?.unit_price,product_total:currentResult.selling_price?.product_total,grand_total:currentResult.selling_price?.grand_total_before_freight||currentResult.selling_price?.grand_total};
 if(window.PV5DbReview?.save)await window.PV5DbReview.save(key,'pending',value);
 showStatus('<b>✓ Quote review snapshot saved.</b> Continue to Impact & Approval when ready.','success');
}
function openKld(){
 const s=selectedSize();if(!s)return;const g=Number(s.bottom_gusset_each_mm||0),url='/kld/pricing-v5/sup/'+Number(s.width_mm)+'x'+Number(s.height_mm)+'-bg-'+g+'-'+g+'.svg';window.open(url,'_blank','noopener');
}
function continueReview(){if(!currentResult)return alert('Calculate a valid quote first.');saveSnapshot().then(()=>window.PV5?.go?.('approval'))}
function wire(){
 if(!onPage())return;
 const add=q('.sales-bottom .btn.outline');if(add&&/Add Packaging Line/i.test(add.textContent||'')){add.disabled=true;add.title='Owner-review HTML validates one Pricing v5 line at a time. Production multi-line quoting is handled in CRM.'}
 qa('#page button').forEach(b=>{const t=(b.textContent||'').trim();if(/Save Draft/i.test(t)){b.id='salesSaveReview';b.textContent='Save Review Snapshot'}if(/Save & Continue to Terms/i.test(t)){b.id='salesContinueReview';b.textContent='Continue to Approval →'}if(/Download KLD/i.test(t))b.dataset.salesKld='1'});
 const save=q('#salesSaveReview');if(save)save.onclick=e=>{e.preventDefault();e.stopPropagation();saveSnapshot()};
 const cont=q('#salesContinueReview');if(cont)cont.onclick=e=>{e.preventDefault();e.stopPropagation();continueReview()};
 qa('[data-sales-kld]').forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();openKld()});
}
function change(e){
 if(!onPage())return;const t=e.target;if(!(t instanceof HTMLElement))return;
 if(t.id==='salesSize'){e.stopImmediatePropagation();sizeChanged();return}
 if(['salesCon','salesQty','salesPrint','salesZip','salesBottomGusset'].includes(t.id)){e.stopImmediatePropagation();schedule()}
}
async function bootSales(){
 if(!onPage())return;await getCatalog();ensureGusset();ensureQuantityControl();await refreshConstructionOptions(true);wire();calculate();
}
function tick(){if(onPage())bootSales().catch(e=>showStatus('<b>Quote setup failed:</b> '+esc(e.message||e),'warn'))}
function init(){document.addEventListener('change',change,true);document.addEventListener('input',e=>{if(onPage()&&e.target?.id==='salesQty')schedule()},true);new MutationObserver(()=>{if(onPage())wire()}).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('pv5:sales-page-ready',tick);setTimeout(tick,0)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();