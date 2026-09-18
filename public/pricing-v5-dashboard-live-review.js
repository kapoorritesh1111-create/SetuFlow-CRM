(()=>{
'use strict';
if(window.__PV5_DASHBOARD_REVIEW_CONTROLLER__) return;
window.__PV5_DASHBOARD_REVIEW_CONTROLLER__=true;

const API='/api/public/pricing-v5-review-preview';
const QUANTITIES=[1000,2000,3000,5000,10000,20000,30000,50000];
const CACHE_TTL_MS=30000;
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
const money=v=>Number.isFinite(Number(v))?'₹'+Number(v).toFixed(2):'—';

let rows=[];
let constructionId='';
let loading=false;
let lastError='';
let mountedSelect=null;
let initialObserver=null;

const broker=window.__PV5_PRICING_MATRIX_BROKER__||(window.__PV5_PRICING_MATRIX_BROKER__={inflight:new Map()});

function onPage(){return /Pricing Dashboard/i.test(q('#page .page-head h2')?.textContent||'')}
function decisionKey(r,qty){return 'price:'+String(r.size_profile_id||r.size_key||r.size_name)+':'+String(constructionId)+':'+String(qty)}
function rowStatus(r){
  const priced=(r.prices||[]).filter(p=>p.ok);
  const unresolved=(r.prices||[]).some(p=>!p.ok&&p.availability!=='not_producible');
  const states=priced.map(p=>window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))||'pending');
  if(unresolved)return['Needs Clarification','amber'];
  if(states.includes('needs_change'))return['Needs Change','amber'];
  if(priced.length&&states.every(x=>x==='approved'))return['Owner Approved','green'];
  return['Review Required','gray']
}
function host(){return q('#page .dashboard-main .matrix-card .table-wrap')}
function showStatus(msg,kind='info'){const h=host();if(h)h.innerHTML='<div class="notice '+kind+'" style="margin:12px">'+esc(msg)+'</div>'}
function cacheKey(c){return 'pv5-dashboard-matrix:'+String(c)}
function readCache(c){try{const raw=JSON.parse(sessionStorage.getItem(cacheKey(c))||'null');if(!raw||Date.now()-Number(raw.saved_at||0)>CACHE_TTL_MS)return null;return Array.isArray(raw.rows)?raw.rows:null}catch(_){return null}}
function writeCache(c,nextRows){try{sessionStorage.setItem(cacheKey(c),JSON.stringify({saved_at:Date.now(),rows:nextRows}))}catch(_){}}
function rowById(id){return rows.find(r=>String(r.size_profile_id||r.size_key)===String(id))||null}

async function fetchMatrix(c){
  const cached=readCache(c);
  if(cached?.length)return cached;
  const key='dashboard:'+c+':CMYKW';
  if(broker.inflight.has(key))return broker.inflight.get(key);
  const promise=(async()=>{
    const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({matrix:true,construction_id:c,print:'CMYKW'}),cache:'no-store'});
    const b=await r.json().catch(()=>({}));
    if(!r.ok||b.ok===false)throw new Error(b.error||'Dashboard pricing unavailable');
    const next=Array.isArray(b.rows)?b.rows:[];
    if(!next.length)throw new Error('No calculated Pricing v5 rows are available for this construction.');
    writeCache(c,next);
    return next;
  })();
  broker.inflight.set(key,promise);
  try{return await promise}finally{broker.inflight.delete(key)}
}

async function load(force=false){
  if(!onPage()||loading)return;
  const sel=q('#dashConstruction'),c=sel?.value;
  if(!c)return;
  if(!force&&c===constructionId&&rows.length){render();return}
  if(!force&&c===constructionId&&lastError)return;
  constructionId=c;
  loading=true;
  lastError='';
  showStatus('Loading live Pricing v5 dashboard prices…');
  try{rows=await fetchMatrix(c);render()}
  catch(e){rows=[];lastError=String(e?.message||e);showStatus(lastError,'warn')}
  finally{loading=false}
}

function patchOwnerTruth(){
  if(!onPage()||!rows.length)return;
  const page=q('#page');if(!page)return;
  const points=rows.flatMap(r=>r.prices||[]);
  const notProducible=points.filter(x=>!x?.ok&&x?.availability==='not_producible').length;
  const unresolved=points.filter(x=>!x?.ok&&x?.availability!=='not_producible').length;
  const approved=rows.reduce((sum,r)=>sum+(r.prices||[]).filter(p=>p.ok&&window.PV5DbReview?.decision?.(decisionKey(r,p.quantity))==='approved').length,0);
  const health=q('.card.health',page);
  if(health)health.innerHTML='<div class="health-title"><div class="metric-icon blue">↗</div><div><h3>Live Pricing Review Status</h3><p>Calculated from the published Pricing v5 engine for the selected construction. No market evidence or approval is assumed.</p></div></div><div class="health-stat"><small>Calculated size rows</small><b>'+rows.length+'</b><span>live v5 rows</span></div><div class="health-stat"><small>Calculated price points</small><b>'+points.length+'</b><span>'+QUANTITIES.map(n=>n.toLocaleString()).join(' / ')+' pcs</span></div><div class="health-stat"><small>N/A / unavailable points</small><b class="'+(unresolved?'up':'down')+'">'+(notProducible+unresolved)+'</b><span>'+notProducible+' intentional N/A'+(unresolved?' · '+unresolved+' need clarification':' · no unresolved failures')+'</span></div><div class="health-stat"><small>Owner-approved points</small><b>'+approved+'</b><span>explicit DB-backed decisions only</span></div>';
  qa('.dash-bottom .card',page).forEach(card=>{
    const h=q('.panel-title h3',card)?.textContent||'';
    if(/Recent Changes & Comments/i.test(h))card.innerHTML='<div class="panel-title"><h3>Owner Review History</h3></div><div class="notice info" style="margin:12px"><b>No sample change history is shown here.</b> Owner decisions and comments are recorded only when explicitly saved during this review.</div>';
  });
}

function render(){
  if(!onPage()||!rows.length)return;
  const card=q('#page .dashboard-main .matrix-card');if(!card)return;
  const title=q('.panel-title h3',card);if(title)title.innerHTML='Pricing Matrix — Stand-Up Pouch <small>(live Pricing v5 calculation)</small>';
  const display=rows.slice(0,8),wrap=q('.table-wrap',card);if(!wrap)return;
  wrap.innerHTML='<table class="table pricing"><thead><tr><th>Size (mm)</th>'+QUANTITIES.map(n=>'<th>'+n.toLocaleString()+'</th>').join('')+'<th>Status</th><th>Actions</th></tr></thead><tbody>'+display.map(r=>{const st=rowStatus(r);return'<tr><td><b>'+esc(r.size_name||r.size_key||'—')+'</b></td>'+QUANTITIES.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n);return'<td>'+(x?.ok?money(x.unit_price):x?.availability==='not_producible'?'<span class="pill gray" title="Approved quantity rule: not producible">N/A</span>':'<span title="Pricing requires clarification">Unavailable</span>')+'</td>'}).join('')+'<td><span class="status"><span class="dot '+st[1]+'"></span>'+st[0]+'</span></td><td><button type="button" class="btn tiny" data-dash-review="'+esc(r.size_profile_id||r.size_key)+'">Review</button></td></tr>'}).join('')+'</tbody></table>';
  const footer=q('.table-footer',card);if(footer)footer.innerHTML='<span>Showing 8 of '+rows.length+' sizes</span><button type="button" class="btn tiny" id="dashFullMatrix">View Full Matrix →</button>';
  patchOwnerTruth();
}

function ensureModal(){
  let modal=q('#modal'),body=q('#modalBody');
  if(modal&&body)return{modal,body};
  modal=document.createElement('div');modal.id='modal';modal.className='modal';
  body=document.createElement('div');body.id='modalBody';body.className='modal-card';
  modal.appendChild(body);document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeReview()});
  return{modal,body};
}
function closeReview(){const modal=q('#modal');if(!modal)return;modal.classList.remove('open');modal.style.display='none'}

function openReview(r){
  if(!r)return;
  const {modal,body}=ensureModal();
  body.innerHTML='<div class="modal-head"><div><h3>Dashboard Price Review</h3><p>'+esc(r.size_name||r.size_key||'Selected size')+'</p></div><button type="button" class="btn outline" id="dashReviewClose">× Close</button></div><div class="modal-body"><div class="notice info"><b>What you are approving:</b> the calculated Pricing v5 selling price for this size, selected construction and quantity. No family is activated from this review.</div><div class="table-wrap"><table class="table"><thead><tr><th>Quantity</th><th>Calculated Price</th><th>Owner Decision</th><th>Action</th></tr></thead><tbody>'+QUANTITIES.map(n=>{const x=(r.prices||[]).find(p=>Number(p.quantity)===n),d=window.PV5DbReview?.decision?.(decisionKey(r,n))||'pending';if(x?.availability==='not_producible')return'<tr><td>'+n.toLocaleString()+'</td><td><span class="pill gray">N/A — Not Producible</span></td><td>Not applicable</td><td><span class="pill gray">No approval required</span></td></tr>';return'<tr><td>'+n.toLocaleString()+'</td><td>'+(x?.ok?money(x.unit_price):'<b>Unavailable</b>')+'</td><td>'+esc(d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':x?.ok?'Pending':'Needs clarification')+'</td><td>'+(x?.ok?'<button type="button" class="btn tiny success" data-dash-decision="approved" data-qty="'+n+'">Approve</button> <button type="button" class="btn tiny danger" data-dash-decision="needs_change" data-qty="'+n+'">Needs Change</button>':'<button type="button" class="btn tiny" data-dash-unavailable="'+n+'">Clarify why unavailable</button>')+'</td></tr>'}).join('')+'</tbody></table></div><label class="field"><span>Owner comment / required change</span><textarea id="dashReviewComment" rows="3" placeholder="Required for Needs Change"></textarea></label><div style="margin-top:10px"><button type="button" class="btn outline" id="dashGoMatrix">Open Full Price Matrix</button></div></div>';
  modal.classList.add('open');modal.style.display='flex';
  q('#dashReviewClose',body)?.addEventListener('click',closeReview);
  q('#dashGoMatrix',body)?.addEventListener('click',()=>{closeReview();window.PV5?.go?.('matrix')});
  qa('[data-dash-decision]',body).forEach(b=>b.addEventListener('click',async()=>{if(!window.PV5DbReview)return alert('Review state is still loading.');const dec=b.dataset.dashDecision,comment=(q('#dashReviewComment',body)?.value||'').trim();if(dec==='needs_change'&&!comment)return alert('Please enter what needs to change.');await window.PV5DbReview.save(decisionKey(r,Number(b.dataset.qty)),dec,{size_profile_id:r.size_profile_id,size_name:r.size_name,construction_id:constructionId,quantity:Number(b.dataset.qty),comment});closeReview();render()}));
  qa('[data-dash-unavailable]',body).forEach(b=>b.addEventListener('click',()=>{closeReview();window.PV5?.go?.('matrix')}));
}

function mount(){
  if(!onPage())return false;
  const sel=q('#dashConstruction');if(!sel)return false;
  if(mountedSelect!==sel){
    mountedSelect=sel;
    sel.addEventListener('change',()=>{rows=[];lastError='';constructionId='';load(true)},{passive:true});
  }
  if(!constructionId)load(false);else if(rows.length&&!q('#page [data-dash-review]'))render();
  return true;
}

function waitForInitialDashboard(){
  if(mount())return;
  if(initialObserver)return;
  const page=q('#page');if(!page)return;
  initialObserver=new MutationObserver(()=>{if(mount()){initialObserver.disconnect();initialObserver=null}});
  initialObserver.observe(page,{childList:true,subtree:true});
}

function wireNavigation(){
  document.addEventListener('click',e=>{
    const review=e.target?.closest?.('[data-dash-review]');
    if(review&&onPage()){
      e.preventDefault();e.stopPropagation();
      const row=rowById(review.dataset.dashReview);
      if(row)openReview(row);
      return;
    }
    const full=e.target?.closest?.('#dashFullMatrix');
    if(full&&onPage()){
      e.preventDefault();e.stopPropagation();window.PV5?.go?.('matrix');return;
    }
    const nav=e.target?.closest?.('[data-page],.nav-item,.top-nav button,.side-nav button');
    if(nav)setTimeout(()=>mount(),0);
  },true);
  if(window.PV5?.go&&!window.PV5.__dashboardWrapped){
    const original=window.PV5.go;
    window.PV5.go=function(page){const out=original.apply(this,arguments);if(page==='dashboard')setTimeout(()=>mount(),0);return out};
    window.PV5.__dashboardWrapped=true;
  }
}

function init(){wireNavigation();waitForInitialDashboard()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();