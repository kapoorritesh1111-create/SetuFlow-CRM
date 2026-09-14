(()=>{
'use strict';
const STORAGE='setu_pricing_v5_selected_family_v1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
function selected(){try{return localStorage.getItem(STORAGE)||'sup'}catch(_){return'sup'}}
function title(){return q('#page .page-head h2')?.textContent?.trim()||''}
function restore(){qa('[data-family-isolated]').forEach(el=>{el.style.display=el.dataset.familyDisplay||'';delete el.dataset.familyIsolated;delete el.dataset.familyDisplay})}
function hide(el){if(!el||el.id==='pv5FamilyContext'||el.closest('#pv5FamilyContext')||el.dataset.familyIsolated)return;el.dataset.familyDisplay=el.style.display||'';el.dataset.familyIsolated='1';el.style.display='none'}
function apply(){restore();if(selected()==='sup')return;const t=title();
  // Sales Quote has a dedicated multi-family controller. Do not hide its layout here.
  if(/Sales Quote/i.test(t))return;
  if(/Pricing Dashboard/i.test(t))qa('#page .metric-grid,#page .health,#page .dash-filters,#page .step-strip,#page .dashboard-main,#page .dash-bottom').forEach(hide);
  else if(/Sizes & KLDs/i.test(t))qa('#page .metric-grid,#page .filters,#page .card.section,#page .sizes-bottom').forEach(hide);
  else if(/Constructions/i.test(t))qa('#page .metric-grid,#page .construction-filters,#page .construction-layout').forEach(hide);
  else if(/Waste & Margins/i.test(t))qa('#page .metric-grid,#page .waste-filters,#page .waste-layout,#page .bottom-actions').forEach(hide);
  else if(/Price Matrix/i.test(t))qa('#page .metric-grid,#page .matrix-toolbar,#page .matrix-actions,#page .matrix-layout').forEach(hide);
}
function boot(){apply();new MutationObserver(()=>setTimeout(apply,100)).observe(document.documentElement,{childList:true,subtree:true});window.addEventListener('storage',()=>setTimeout(apply,50));setInterval(apply,1200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();