(()=>{
'use strict';
const API='/api/public/pricing-v5-review-preview';
const PAGE_SIZE=10;
let rows=[],page=1,lastConstruction=null,loading=false,lastError='',lastAttempt=0,catalogPromise=null,tickTimer=null;
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';
function metric(label,value,sub){const card=qa('#page .metric-card').find(c=>(q('.metric-copy small',c)?.textContent||'').trim()===label);if(!card)return;const v=q('.metric-copy strong',card),sp=q('.metric-copy span',card);if(v)v.textContent=String(value);if(sp)sp.textContent=sub}
function onPage(){return /Price Matrix/i.test(q('#page .page-head h2')?.textContent||'')}
function constructionSelect(){return q('#matrixConstruction')||qa('#page label.field').find(l=>/Construction/i.test(q(':scope>span',l)?.textContent||''))?.querySelector('select')}
function fieldSelect(label){return qa('#page label.field').find(l=>new RegExp(label,'i').test(q(':scope>span',l)?.textContent||''))?.querySelector('select')||null}
async function catalog(){if(!catalogPromise)catalogPromise=fetch(API,{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));return catalogPromise}
async function selectedChargeCodes(){const zip=fieldSelect('Zipper');if(!zip||!/with\s+zipper/i.test(zip.options?.[zip.selectedIndex]?.textContent||zip.value||''))return[];const c=await catalog();const match=(c.charges||[]).find(x=>/zipper/i.test(String(x.code||'')+' '+String(x.name||'')));return match?.code?[match.code]:[]}
function totalPages(){return Math.max(1,Math.ceil(rows.length/PAGE_SIZE))}
function decisionKey(row,qty){return 'price:'+String(row.size_profile_id||row.size_key||row.size_name)+':'+String(lastConstruction)+':'+String(qty)}
function status(row){
 const priced=(row.prices||[]).filter(p=>p.ok);
 const unresolved=(row.prices||[]).some(p=>!p.ok&&p.availability==='needs_clarification');
 const states=priced.map(p=>window.PV5DbReview?.decision?.(decisionKey(row,p.quantity))||'pending');
 if(unresolved)return['Needs Clarification','amber'];
 if(states.includes('needs_change'))return['Needs Change','amber'];
 if(priced.length&&states.every(x=>x==='approved'))return['Owner Approved','green'];
 return['Review Required','gray']
}
function host(){return q('#liveMatrix')}
function showStatus(msg,kind='info'){const h=host();if(h)h.innerHTML='<div class="notice '+kind+'" style="margin:16px">'+esc(msg)+'</div>'}
async function load(force=false){if(!onPage()||loading)return;const c=constructionSelect()?.value;if(!c)return;const now=Date.now();if(!force&&c===lastConstruction&&rows.length)return;if(!force&&c===lastConstruction&&lastError&&now-lastAttempt<10000)return;loading=true;lastAttempt=now;if(c!==lastConstruction){rows=[];page=1;lastError=''}lastConstruction=c;showStatus('Loading live Pricing v5 matrix…');try{const selected_charge_codes=await selectedChargeCodes();const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matrix:true,construction_id:c,print:'CMYKW',selected_charge_codes}),cache:'no-store'});const b=await r.json();if(!r.ok||b?.ok===false)throw new Error(b?.error||'Price matrix unavailable');rows=Array.isArray(b?.rows)?b.rows:[];if(!rows.length)throw new Error('No calculated Pricing v5 rows are available for this construction.');lastError='';render()}catch(e){rows=[];lastError=String(e.message||e);showStatus(lastError,'warn')}finally{loading=false}}
function pager(){let h='<div class="pager"><button data-mp="prev" '+(page<=1?'disabled':'')+'>‹ Previous</button>';for(let i=1;i<=totalPages();i++)h+='<button data-mp="'+i+'" class="'+(i===page?'on':'')+'">'+i+'</button>';return h+'<button data-mp="next" '+(page>=totalPages()?'disabled':'')+'>Next ›</button></div>'}
function render(){
 if(!onPage())return;const h=host();if(!h)return;if(!rows.length){if(!loading&&lastError)showStatus(lastError,'warn');return}
 const quantities=[1000,2000,3000,5000,10000,20000,30000,50000],start=(page-1)*PAGE_SIZE,display=rows.slice(start,start+PAGE_SIZE);
 const priced=rows.flatMap(r=>(r.prices||[]).filter(p=>p.ok).map(p=>({r,p})));
 const approved=priced.filter(({r,p})=>(window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))||'pending')==='approved').length;
 const changed=priced.filter(({r,p})=>(window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))||'pending')==='needs_change').length;
 const pending=Math.max(0,priced.length-approved-changed);
 metric('Approved Prices',approved,approved+' of '+priced.length+' producible price points');
 metric('Needs Review',pending,pending+' producible price points awaiting review');
 metric('Change Requested',changed,changed+' price points flagged by owner');
 h.innerHTML='<table class="table pricing large"><thead><tr><th>Size (mm)</th>'+quantities.map(n=>'<th>'+n.toLocaleString()+'</th>').join('')+'<th>Owner Status</th><th>Actions</th></tr></thead><tbody>'+display.map(r=>{const st=status(r);return'<tr><td><b>'+esc(r.size_name||r.size_key||'—')+'</b></td>'+quantities.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n),state=x?.ok?'priced':x?.availability||'needs_clarification',errors=(x?.validation_errors||[]).join(' ');return'<td data-price-state="'+esc(state)+'" data-price-errors="'+esc(errors)+'">'+(x?.ok?money(x.unit_price):state==='not_producible'?'<span class="pill gray">N/A</span>':'—')+'</td>'}).join('')+'<td><span class="status"><span class="dot '+st[1]+'"></span>'+st[0]+'</span></td><td><button class="btn tiny" data-mreview="'+esc(r.size_profile_id||r.size_key)+'">Review Row</button></td></tr>'}).join('')+'</tbody></table><div class="table-footer"><span>Showing '+(start+1)+'–'+Math.min(start+PAGE_SIZE,rows.length)+' of '+rows.length+' sizes • Page '+page+' of '+totalPages()+'</span>'+pager()+'</div>';bind(h)
}
function findRow(id){return rows.find(r=>String(r.size_profile_id||r.size_key)===String(id))}
function moveReviewRow(r,delta){
 const idx=rows.findIndex(x=>String(x.size_profile_id||x.size_key)===String(r.size_profile_id||r.size_key)),next=idx+delta;
 if(idx<0||next<0||next>=rows.length)return null;
 page=Math.floor(next/PAGE_SIZE)+1;render();return rows[next]
}

function bind(h){qa('[data-mp]',h).forEach(b=>b.onclick=()=>{const v=b.dataset.mp;if(v==='prev')page=Math.max(1,page-1);else if(v==='next')page=Math.min(totalPages(),page+1);else page=Number(v)||1;render()});qa('[data-mreview]',h).forEach(b=>b.onclick=()=>openReview(findRow(b.dataset.mreview)))}
function openReview(r){
 if(!r)return;const modal=q('#modal'),body=q('#modalBody');if(!modal||!body)return;
 const quantities=[1000,2000,3000,5000,10000,20000,30000,50000],idx=rows.findIndex(x=>String(x.size_profile_id||x.size_key)===String(r.size_profile_id||r.size_key));
 body.innerHTML='<div class="modal-head"><div><h3>Price Row Owner Review</h3><p>'+esc(r.size_name||r.size_key||'Selected size')+' · Size '+(idx+1)+' of '+rows.length+'</p></div><button class="btn outline" id="mpClose">× Close</button></div><div class="modal-body"><div class="table-wrap"><table class="table"><thead><tr><th>Quantity</th><th>Calculated Price</th><th>Owner Decision</th><th>Action</th></tr></thead><tbody>'+quantities.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n),d=window.PV5DbReview?.decision?.(decisionKey(r,n))||'pending',state=x?.ok?'priced':x?.availability||'needs_clarification';if(state==='not_producible')return'<tr><td>'+n.toLocaleString()+'</td><td><span class="pill gray">N/A — Not Producible</span></td><td>Not applicable</td><td><span class="pill gray">No approval required</span></td></tr>';if(!x?.ok)return'<tr><td>'+n.toLocaleString()+'</td><td>Unavailable</td><td>Needs clarification</td><td><span class="pill amber">Use matrix cell to resolve</span></td></tr>';return'<tr><td>'+n.toLocaleString()+'</td><td>'+money(x.unit_price)+'</td><td>'+esc(d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Pending')+'</td><td><button class="btn tiny success" data-mdecision="approved" data-qty="'+n+'">Approve</button> <button class="btn tiny danger" data-mdecision="needs_change" data-qty="'+n+'">Needs Change</button></td></tr>'}).join('')+'</tbody></table></div><label class="field"><span>Owner comment / required change</span><textarea id="mpComment" rows="3" placeholder="Required for Needs Change"></textarea></label><div class="row wrap" style="justify-content:space-between;gap:8px;margin-top:12px"><button class="btn outline" id="mpPrevRow" '+(idx<=0?'disabled':'')+'>← Previous Size</button><button class="btn primary" id="mpNextRow" '+(idx>=rows.length-1?'disabled':'')+'>Next Size →</button></div></div>';
 modal.classList.add('open');modal.style.display='flex';
 q('#mpClose').onclick=()=>{modal.classList.remove('open');modal.style.display='none'};
 q('#mpPrevRow').onclick=()=>{const target=moveReviewRow(r,-1);if(target)openReview(target)};
 q('#mpNextRow').onclick=()=>{const target=moveReviewRow(r,1);if(target)openReview(target)};
 qa('[data-mdecision]',body).forEach(b=>b.onclick=async()=>{if(!window.PV5DbReview)return alert('Review state is still loading.');const dec=b.dataset.mdecision,comment=(q('#mpComment')?.value||'').trim();if(dec==='needs_change'&&!comment)return alert('Please enter what needs to change.');await window.PV5DbReview.save(decisionKey(r,Number(b.dataset.qty)),dec,{size_profile_id:r.size_profile_id,size_name:r.size_name,construction_id:lastConstruction,quantity:Number(b.dataset.qty),comment});render();openReview(r)})
}
function tick(){if(!onPage())return;const sel=constructionSelect(),c=sel?.value,zip=fieldSelect('Zipper');if(sel&&!sel.dataset.mpWired){sel.dataset.mpWired='1';sel.addEventListener('change',()=>{rows=[];lastError='';lastConstruction=null;setTimeout(()=>load(true),30)})}if(zip&&!zip.dataset.mpWired){zip.dataset.mpWired='1';zip.addEventListener('change',()=>{rows=[];lastError='';lastConstruction=null;setTimeout(()=>load(true),30)})}if(c&&c!==lastConstruction)load(true);else if(rows.length&&!q('#liveMatrix .pager'))render();else if(c&&!rows.length&&lastError&&Date.now()-lastAttempt>=10000)load(false)}
function scheduleTick(delay=100){if(tickTimer)clearTimeout(tickTimer);tickTimer=setTimeout(()=>{tickTimer=null;tick()},delay)}
function init(){new MutationObserver(()=>scheduleTick()).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleTick(0)});tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();