(()=>{
'use strict';
const FAMILY_KEY='setu_pricing_v5_selected_family_v1';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
let lastPage=false,initializedFor='';
function onPage(){return /Sales Quote/i.test(q('#page .page-head h2')?.textContent||'')}
function selected(){try{return localStorage.getItem(FAMILY_KEY)||'sup'}catch(_){return'sup'}}
function restoreHidden(){qa('[data-pv5-sup-only-hidden]').forEach(el=>{el.style.display=el.dataset.pv5OldDisplay||'';delete el.dataset.pv5SupOnlyHidden});qa('[data-family-isolated]').forEach(el=>{el.style.display=el.dataset.familyDisplay||'';delete el.dataset.familyIsolated;delete el.dataset.familyDisplay})}
function cleanGeneric(){if(!onPage())return;q('#pv5FamilyContext')?.remove();q('#pv5ReturnSup')?.remove();restoreHidden()}
function syncQuoteFamily(){if(!onPage())return;const sel=q('#quoteFamilyReview');if(!sel)return;const key=selected();if(sel.value!==key&&[...sel.options].some(o=>o.value===key)){sel.value=key;sel.dispatchEvent(new Event('change',{bubbles:true}))}if(sel.dataset.salesRecoveryWired!=='1'){sel.dataset.salesRecoveryWired='1';sel.addEventListener('change',()=>{try{localStorage.setItem(FAMILY_KEY,sel.value||'sup')}catch(_){}})}initializedFor=key}
function tick(){const now=onPage();if(!now){lastPage=false;initializedFor='';return}cleanGeneric();syncQuoteFamily();lastPage=true}
function init(){new MutationObserver(()=>setTimeout(tick,50)).observe(document.documentElement,{childList:true,subtree:true});setInterval(tick,350);tick()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();