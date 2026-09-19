(()=>{
'use strict';
const API='/api/public/pricing-v5-review-preview';
const PAGE_SIZE=10;
const QUANTITIES=[1000,2000,3000,5000,10000,20000,30000,50000];
let rows=[],page=1,lastKey='',loading=false,pendingReload=false,lastError='',catalogPromise=null,tickTimer=null;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
function onPage(){return /Price Matrix/i.test(q('#page .page-head h2')?.textContent||'')}
function sizeSelect(){return q('#matrixSize')}
function printSelect(){return q('#matrixPrint')}
function addonSelect(){return q('#matrixAddon')}
function bottomSelect(){return q('#matrixBottomGusset')}
async function catalog(){if(!catalogPromise)catalogPromise=fetch(API,{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));return catalogPromise}
function host(){return q('#liveMatrix')}
function metric(label,value,sub){const card=qa('#page .metric-card').find(c=>(q('.metric-copy small',c)?.textContent||'').trim()===label);if(!card)return;const v=q('.metric-copy strong',card),sp=q('.metric-copy span',card);if(v)v.textContent=String(value);if(sp)sp.textContent=sub}
function selectedSize(c){return (c.sizes||[]).find(s=>String(s.id)===String(sizeSelect()?.value))}
function syncBottom(c){const s=selectedSize(c),h=q('#matrixBottomGussetHost');if(!h)return;const conditional=s?.route==='conditional'||s?.bottom_registration_mode==='optional';if(!conditional){h.innerHTML='';return}const current=bottomSelect()?.value||'solid_unregistered';h.innerHTML='<label class="field"><span>Bottom Gusset</span><select id="matrixBottomGusset"><option value="solid_unregistered">Unregistered / solid color</option><option value="registered_artwork">Registered / logo-text-artwork</option></select></label>';q('#matrixBottomGusset').value=current}
async function chargeCodes(c){if(addonSelect()?.value!=='zipper')return[];const x=(c.charges||[]).find(v=>/zipper/i.test(String(v.code||'')+' '+String(v.name||'')));return x?.code?[x.code]:[]}
function totalPages(){return Math.max(1,Math.ceil(rows.length/PAGE_SIZE))}
function pager(){let h='<div class="pager"><button data-mp="prev" '+(page<=1?'disabled':'')+'>‹ Previous</button>';for(let i=1;i<=totalPages();i++)h+='<button data-mp="'+i+'" class="'+(i===page?'on':'')+'">'+i+'</button>';return h+'<button data-mp="next" '+(page>=totalPages()?'disabled':'')+'>Next ›</button></div>'}
function decisionKey(row,qty){return 'price:'+String(sizeSelect()?.value)+':'+String(row.construction_id)+':'+String(qty)}
function status(row){const priced=(row.prices||[]).filter(p=>p.ok),states=priced.map(p=>window.PV5DbReview?.decision?.(decisionKey(row,p.quantity))||'pending');if(states.includes('needs_change'))return['Needs Change','amber'];if(priced.length&&states.every(x=>x==='approved'))return['Owner Approved','green'];return['Review Required','gray']}
function showStatus(msg,kind='info'){const h=host();if(h)h.innerHTML='<div class="notice '+kind+'" style="margin:16px">'+esc(msg)+'</div>'}
async function load(force=false){
 if(!onPage())return;
 if(loading){if(force)pendingReload=true;return}
 const c=await catalog();syncBottom(c);
 const size=sizeSelect()?.value;if(!size)return;
 const key=[size,printSelect()?.value,addonSelect()?.value,bottomSelect()?.value].join('|');
 if(!force&&key===lastKey&&rows.length)return;
 loading=true;pendingReload=false;lastKey=key;showStatus('Loading valid constructions for selected size…');
 try{
  const selected_charge_codes=await chargeCodes(c);
  const requestKey=[size,printSelect()?.value,addonSelect()?.value,bottomSelect()?.value].join('|');
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({size_matrix:true,size_profile_id:size,print:printSelect()?.value||'CMYKW',selected_charge_codes,bottom_print_mode:bottomSelect()?.value||undefined}),cache:'no-store'}),b=await r.json();
  if(!r.ok||b?.ok===false)throw new Error(b?.error||'Price matrix unavailable');
  const currentKey=[sizeSelect()?.value,printSelect()?.value,addonSelect()?.value,bottomSelect()?.value].join('|');
  if(currentKey!==requestKey){pendingReload=true;return}
  rows=Array.isArray(b.rows)?b.rows:[];page=1;lastError='';render();
 }catch(e){rows=[];lastError=String(e.message||e);showStatus(lastError,'warn')}
 finally{loading=false;if(pendingReload){pendingReload=false;setTimeout(()=>load(true),0)}}
}
function render(){if(!onPage())return;const h=host();if(!h)return;if(!rows.length){showStatus(lastError||'No compatible constructions are available for this size.','warn');return}const start=(page-1)*PAGE_SIZE,display=rows.slice(start,start+PAGE_SIZE),priced=rows.flatMap(r=>(r.prices||[]).filter(p=>p.ok).map(p=>({r,p}))),approved=priced.filter(({r,p})=>(window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))||'pending')==='approved').length,changed=priced.filter(({r,p})=>(window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))||'pending')==='needs_change').length,pending=Math.max(0,priced.length-approved-changed);metric('Approved Prices',approved,approved+' of '+priced.length+' producible price points');metric('Needs Review',pending,pending+' producible price points awaiting review');metric('Change Requested',changed,changed+' price points flagged by owner');h.innerHTML='<table class="table pricing large"><thead><tr><th>Construction</th>'+QUANTITIES.map(n=>'<th>'+n.toLocaleString()+'</th>').join('')+'<th>Owner Status</th><th>Actions</th></tr></thead><tbody>'+display.map(r=>{const st=status(r);return '<tr><td><b>'+esc(r.construction_name||r.construction_key||'—')+'</b><br><small>'+esc(r.layer_stack||'')+'</small></td>'+QUANTITIES.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n),state=x?.ok?'priced':x?.availability||'needs_clarification';return '<td data-price-state="'+esc(state)+'" data-price-errors="'+esc((x?.validation_errors||[]).join(' '))+'">'+(x?.ok?money(x.unit_price):state==='not_producible'?'<span class="pill gray">N/A</span>':'—')+'</td>'}).join('')+'<td><span class="status"><span class="dot '+st[1]+'"></span>'+st[0]+'</span></td><td><button class="btn tiny" data-mreview="'+esc(r.construction_id)+'">Review Row</button></td></tr>'}).join('')+'</tbody></table><div class="table-footer"><span>Showing '+(start+1)+'–'+Math.min(start+PAGE_SIZE,rows.length)+' of '+rows.length+' valid constructions • Page '+page+' of '+totalPages()+'</span>'+pager()+'</div>';bind(h);document.dispatchEvent(new CustomEvent('pv5:matrix-rendered',{detail:{page,total_pages:totalPages(),row_count:display.length,total_rows:rows.length}}))}
function bind(h){qa('[data-mp]',h).forEach(b=>b.onclick=()=>{const v=b.dataset.mp;if(v==='prev')page=Math.max(1,page-1);else if(v==='next')page=Math.min(totalPages(),page+1);else page=Number(v)||1;render()});qa('[data-mreview]',h).forEach(b=>b.onclick=()=>openReview(rows.find(r=>String(r.construction_id)===String(b.dataset.mreview))))}
function openReview(r){if(!r)return;const modal=q('#modal'),body=q('#modalBody');if(!modal||!body)return;body.innerHTML='<div class="modal-head"><div><h3>Construction Price Review</h3><p>'+esc(r.construction_name||r.construction_key)+' · '+esc(r.layer_stack||'')+'</p></div><button class="btn outline" id="mpClose">× Close</button></div><div class="modal-body"><div class="table-wrap"><table class="table"><thead><tr><th>Quantity</th><th>Calculated Price</th><th>Owner Decision</th><th>Action</th></tr></thead><tbody>'+QUANTITIES.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n),d=window.PV5DbReview?.decision?.(decisionKey(r,n))||'pending',state=x?.ok?'priced':x?.availability||'needs_clarification';if(state==='not_producible')return '<tr><td>'+n.toLocaleString()+'</td><td><span class="pill gray">N/A — Not Producible</span></td><td>Not applicable</td><td>No approval required</td></tr>';if(!x?.ok)return '<tr><td>'+n.toLocaleString()+'</td><td>Unavailable</td><td>Needs clarification</td><td>—</td></tr>';return '<tr><td>'+n.toLocaleString()+'</td><td>'+money(x.unit_price)+'</td><td>'+esc(d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Pending')+'</td><td><button class="btn tiny success" data-mdecision="approved" data-qty="'+n+'">Approve</button> <button class="btn tiny danger" data-mdecision="needs_change" data-qty="'+n+'">Needs Change</button></td></tr>'}).join('')+'</tbody></table></div><label class="field"><span>Owner comment / required change</span><textarea id="mpComment" rows="3"></textarea></label></div>';modal.classList.add('open');modal.style.display='flex';q('#mpClose').onclick=()=>{modal.classList.remove('open');modal.style.display='none'};qa('[data-mdecision]',body).forEach(b=>b.onclick=async()=>{if(!window.PV5DbReview)return alert('Review state is still loading.');const dec=b.dataset.mdecision,comment=(q('#mpComment')?.value||'').trim();if(dec==='needs_change'&&!comment)return alert('Please enter what needs to change.');await window.PV5DbReview.save(decisionKey(r,Number(b.dataset.qty)),dec,{size_profile_id:sizeSelect()?.value,construction_id:r.construction_id,quantity:Number(b.dataset.qty),comment});render();openReview(r)})}
function clearPriceDetail(){const host=q('#priceWhy');if(host)host.innerHTML='<div class="pv5pd-shell"><div class="pv5pd-head"><div><h3>Price Detail</h3><p>Select any live matrix price</p></div></div><div class="pv5pd-empty">Click a price to see the exact engine-backed build.</div></div>'}
function matrixControlChanged(target){
 if(!onPage()||!(target instanceof HTMLSelectElement))return;
 if(!['matrixSize','matrixPrint','matrixAddon','matrixBottomGusset'].includes(target.id))return;
 rows=[];page=1;lastKey='';lastError='';document.dispatchEvent(new CustomEvent('pv5:matrix-selection-changed',{detail:{control:target.id,value:target.value}}));clearPriceDetail();showStatus('Refreshing matrix for the new selection…');load(true);
}
function wire(){const reset=q('#matrixReset');if(reset&&reset.dataset.mpWired!=='1'){reset.dataset.mpWired='1';reset.onclick=()=>{const c=catalogPromise;Promise.resolve(c).then(cat=>{if(q('#matrixSize'))q('#matrixSize').value=cat?.sizes?.[0]?.id||'';if(q('#matrixPrint'))q('#matrixPrint').value='CMYKW';if(q('#matrixAddon'))q('#matrixAddon').value='';rows=[];page=1;lastKey='';lastError='';clearPriceDetail();load(true)})}}}
function tick(){if(!onPage())return;wire();if(sizeSelect()&&!rows.length&&!loading)load(false)}
function scheduleTick(delay=100){if(tickTimer)clearTimeout(tickTimer);tickTimer=setTimeout(()=>{tickTimer=null;tick()},delay)}
function init(){window.PV5MatrixPagination={load:()=>load(true),render};document.addEventListener('change',e=>matrixControlChanged(e.target),true);new MutationObserver(()=>scheduleTick()).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('pv5:matrix-page-ready',()=>load(true));tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();