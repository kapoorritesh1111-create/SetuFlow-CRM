(()=>{
'use strict';
const FAMILY_KEY='setu_pricing_v5_selected_family_v1';
const ORDER=['dashboard','sizes','constructions','rates','waste','matrix','competitor','sales','families','approval'];
const q=(s,r=document)=>r.querySelector(s);
const qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
let lastPage='',tickTimer=null;
try{history.scrollRestoration='manual'}catch(_){}
function resetViewport(){try{window.scrollTo({top:0,left:0,behavior:'auto'})}catch(_){window.scrollTo(0,0)};try{document.documentElement.scrollLeft=0;document.body.scrollLeft=0}catch(_){};const tabs=q('#tabs');if(tabs)tabs.scrollLeft=0;}
function labelOf(select){const l=select.closest('label');const sp=l?.querySelector(':scope > span');return (sp?.textContent||l?.textContent||'').trim().toLowerCase();}
function currentPage(){const active=q('#tabs [data-page].active')||q('#sideNav [data-page].active');if(active?.dataset.page)return active.dataset.page;const title=q('#page .page-head h2')?.textContent||'';const map={Pricing:'dashboard','Sizes':'sizes','Constructions':'constructions','Rates':'rates','Waste':'waste','Price Matrix':'matrix','Competitor':'competitor','Sales Quote':'sales','Packaging Families':'families','Impact':'approval'};for(const k of Object.keys(map))if(title.includes(k))return map[k];return'dashboard';}
function goPage(p){window.PV5?.go?.(p);setTimeout(resetViewport,0);setTimeout(resetViewport,120);}
function next(){const p=currentPage(),i=ORDER.indexOf(p);goPage(ORDER[Math.min(ORDER.length-1,Math.max(0,i+1))]);}
function setFamily(v){try{localStorage.setItem(FAMILY_KEY,v);sessionStorage.setItem('pv5_reset_viewport','1')}catch(_){};resetViewport();location.reload();}
function ensureReset(){const ctx=q('#pv5FamilyContext');if(!ctx)return;let b=q('#pv5ReturnSup');if(!b){b=document.createElement('button');b.id='pv5ReturnSup';b.className='btn outline';b.textContent='← Return to Stand Up Pouches';b.style.margin='0 0 12px 0';b.onclick=()=>setFamily('sup');ctx.prepend(b);}}
function matrixTruth(){const live=q('#liveMatrix');const panel=q('#priceWhy');if(!live||!panel)return;const hasTable=!!live.querySelector('table');const unavailable=/unavailable|loading/i.test(live.textContent||'');if(!hasTable||unavailable){panel.innerHTML='<div class="panel-title"><h3>Price Detail</h3></div><div class="notice info" style="margin:16px">Select a live matrix price after the matrix loads. No approval or cost breakdown is assumed.</div>';}}
document.addEventListener('change',e=>{const s=e.target;if(!(s instanceof HTMLSelectElement))return;if(!labelOf(s).includes('packaging family'))return;
  if(s.id==='quoteFamilyReview'||currentPage()==='sales')return;
  const v=s.value||'sup';e.stopImmediatePropagation();setFamily(v);
},true);
document.addEventListener('click',e=>{const b=e.target.closest('button,a');if(!b)return;const t=(b.textContent||'').trim();if(b.matches('[data-family-select]')){e.preventDefault();e.stopImmediatePropagation();window.PV5?.family?.(b.dataset.familySelect||'sup');return;}if(b.matches('[data-page]')){setTimeout(resetViewport,0);setTimeout(resetViewport,120);return;}if(/Continue to Next Section/i.test(t)){e.preventDefault();e.stopImmediatePropagation();next();return;}if(/View Full Matrix/i.test(t)){e.preventDefault();e.stopImmediatePropagation();goPage('matrix');return;}if(/View Approval Summary/i.test(t)){e.preventDefault();e.stopImmediatePropagation();goPage('approval');return;}},true);
function tick(){ensureReset();matrixTruth();qa('#page select').forEach(s=>{s.disabled=false;s.style.pointerEvents='auto';});const p=currentPage();if(p!==lastPage){lastPage=p;setTimeout(resetViewport,0);setTimeout(resetViewport,120);}}
function scheduleTick(delay=50){if(tickTimer)clearTimeout(tickTimer);tickTimer=setTimeout(()=>{tickTimer=null;tick()},delay)}
function boot(){let force=false;try{force=sessionStorage.getItem('pv5_reset_viewport')==='1';sessionStorage.removeItem('pv5_reset_viewport')}catch(_){};if(force||window.scrollY>0||window.scrollX>0){resetViewport();setTimeout(resetViewport,100);setTimeout(resetViewport,350);}new MutationObserver(()=>scheduleTick()).observe(document.documentElement,{childList:true,subtree:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)scheduleTick(0)});tick();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();