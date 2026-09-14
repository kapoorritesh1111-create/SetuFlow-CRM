(()=>{
'use strict';
const API='/api/public/pricing-v5-owner-review-state';
const STORAGE='setu_pricing_v5_premium_review_v3';
const qs=(s,r=document)=>r.querySelector(s), qsa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
let db={}; let hydrating=false;

async function load(){
  try{const r=await fetch(API,{cache:'no-store'});const b=await r.json();if(!r.ok||!b.ok)return;db={};(b.items||[]).forEach(x=>db[x.review_key]=x);hydrateLegacy();patchAll();}catch(e){console.warn('[pricing-v5-review-sync] load failed',e)}
}
async function save(key,decision,value={}){
  const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({review_key:key,decision,value_json:value,reviewer_name:'Stark Packmate Owner'})});
  const b=await r.json().catch(()=>({}));if(!r.ok||!b.ok)throw new Error(b.error||'Unable to save review decision');db[key]=b.item;hydrateLegacy();patchAll();return b.item;
}
function legacy(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}}
function hydrateLegacy(){
  if(hydrating)return;hydrating=true;
  try{
    const x={kldApprovals:{},businessApprovals:{},clarifications:{}};
    Object.values(db).forEach(item=>{
      const k=item.review_key, d=item.decision, v=item.value_json||{};
      if(k.startsWith('clarification:')) x.clarifications[k.slice(14)]=(v.answer||'')+'|||'+(v.comment||'');
      if(k.startsWith('business:')) x.businessApprovals[k.slice(9)]=d==='approved'?true:d==='needs_change'?false:undefined;
      if(k.startsWith('family:')) x.businessApprovals['family_'+k.slice(7)]=d==='approved'?true:d==='needs_change'?false:undefined;
      if(k.startsWith('kld:')) x.kldApprovals[k.slice(4)]=d==='approved'?'approved':d==='needs_change'?'change':undefined;
    });
    localStorage.setItem(STORAGE,JSON.stringify(x));
  }catch(_){} finally{hydrating=false}
}
function decision(key){return db[key]?.decision||'pending'}
function count(prefix,decisionName){return Object.entries(db).filter(([k,v])=>k.startsWith(prefix)&&(!decisionName||v.decision===decisionName)).length}
function textReplace(root,re,txt){qsa('*',root).filter(el=>el.children.length===0&&re.test(el.textContent||'')).forEach(el=>el.textContent=txt)}
function buttonLabel(btn,label,disabled=false){btn.textContent=label;btn.disabled=disabled;btn.classList.toggle('disabled',disabled)}
function reviewCounts(){
  const clarAnswered=count('clarification:','answered');
  const businessApproved=count('business:','approved');
  const familyApproved=count('family:','approved');
  const kldApproved=count('kld:','approved');
  const allClar=clarAnswered>=6, allBusiness=businessApproved>=8, allFamily=familyApproved>=6, allKld=kldApproved>=20;
  return {clarAnswered,businessApproved,familyApproved,kldApproved,ready:allClar&&allBusiness&&allFamily&&allKld};
}
function patchGlobalTruth(){
  const p=qs('#page');if(!p)return;const c=reviewCounts();
  textReplace(p,/^8 of 12 sections completed$/i,'Owner review in progress');
  textReplace(p,/^67%$/,'0%');
  textReplace(p,/^Ready for approval$/i,c.ready?'Owner review complete':'Owner review required');
  textReplace(p,/^Good$/i,c.ready?'Ready':'Not Ready');
}
function patchFamilies(){
  const p=qs('#page');if(!p||!/All Packaging Families/i.test(p.textContent||''))return;
  const cards=qsa('.family-card',p);const keys=['sup','flat_bottom','center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch'];
  cards.forEach((card,i)=>{
    const d=decision('family:'+keys[i]);
    textReplace(card,/^Owner Approved$/i,d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Owner Review Required');
    textReplace(card,/^Pending Owner Review$/i,d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Pending Owner Review');
    card.classList.toggle('owner-approved',d==='approved');
  });
}
function patchActivation(){
  const p=qs('#page');if(!p||!/Impact & Approval/i.test(p.textContent||''))return;const c=reviewCounts();
  textReplace(p,/Ready for Activation/i,c.ready?'Ready for Activation':'Not Ready for Activation');
  textReplace(p,/All critical items are approved\. Resolve remaining items to activate\./i,c.ready?'All owner review requirements are complete.':'Owner review is incomplete. Activation remains locked until all required decisions are saved.');
  textReplace(p,/\d+ of 8 approved/i,c.businessApproved+' of 8 approved');
  textReplace(p,/\d+ of 20 approved/i,c.kldApproved+' of 20 approved');
  textReplace(p,/\d+ of 12 reviewed/i,c.familyApproved+' of 6 approved');
  textReplace(p,/\d+ open items/i,(6-c.clarAnswered)+' open items');
  const pct=Math.round(((c.businessApproved+c.kldApproved+c.familyApproved+c.clarAnswered)/(8+20+6+6))*100);
  textReplace(p,/\d+% complete/i,pct+'% complete');
}
function sizeKeyFromRow(tr){const a=qsa('td',tr);return (a[1]?.textContent||a[0]?.textContent||'').trim().replace(/\s+/g,' ')}
function patchSizes(){
  const p=qs('#page');if(!p||!/Sizes & KLDs/i.test(p.textContent||''))return;
  qsa('tbody tr',p).forEach(tr=>{
    const k=sizeKeyFromRow(tr);if(!k)return;const d=decision('size:'+k);const status=qsa('td',tr).find(td=>/Review Required|Owner Approved|Needs Change|Approved|Pending/i.test(td.textContent||''));
    if(status) status.textContent=d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Review Required';
    const actionCell=qsa('td',tr).at(-1);if(!actionCell)return;const buttons=qsa('button',actionCell);let decBtn=buttons.find(b=>/Approve|Approved|Needs Change/i.test(b.textContent||''));
    if(decBtn){decBtn.disabled=false;decBtn.classList.remove('disabled');buttonLabel(decBtn,d==='approved'?'✓ Owner Approved':d==='needs_change'?'Needs Change':'✓ Approve');decBtn.onclick=async e=>{e.preventDefault();e.stopPropagation();if(d==='approved')return save('size:'+k,'pending',{size:k});if(d==='needs_change')return save('size:'+k,'pending',{size:k});await save('size:'+k,'approved',{size:k});rerender('sizes')};}
  });
  const c=count('size:','approved');textReplace(p,/^20\/20$/,'0/20');textReplace(p,/100% approved/i,c+' owner approved');
}
function patchConstructions(){
  const p=qs('#page');if(!p||!/Constructions/i.test(p.textContent||''))return;
  qsa('tbody tr',p).forEach(tr=>{const name=qsa('td',tr)[0]?.textContent?.trim();if(!name)return;const d=decision('construction:'+name);const tds=qsa('td',tr);const status=tds.find(td=>/Review Required|Approved|Needs Change/i.test(td.textContent||''));if(status)status.textContent=d==='approved'?'Owner Approved':d==='needs_change'?'Needs Change':'Review Required';const view=qsa('button',tr).find(b=>/^View$/i.test(b.textContent||''));if(view)view.onclick=e=>{e.preventDefault();e.stopPropagation();openConstruction(name,tr,d)};});
  textReplace(p,/^Approved$/i,'Review Required');
  textReplace(p,/^44$/,'44');
  textReplace(p,/100%/,'Owner review required');
}
function openConstruction(name,tr,d){
  const modal=qs('#modal'),body=qs('#modalBody');if(!modal||!body)return;const detail=qsa('td',tr).map(x=>x.textContent.trim()).join(' | ');body.innerHTML='<div class="modal-head"><h3>Construction Owner Review</h3><button class="btn outline" id="dbClose">✕ Close</button></div><div class="card" style="padding:16px"><h3>'+esc(name)+'</h3><p>'+esc(detail)+'</p><label class="field"><span>Owner comment / required change</span><textarea id="dbConstructionComment" rows="4"></textarea></label><div class="row wrap" style="gap:8px;margin-top:12px"><button class="btn success" id="dbConstructionApprove">✓ Approve</button><button class="btn danger" id="dbConstructionChange">Needs Change</button><button class="btn outline" id="dbConstructionQuestion">Answer construction clarification →</button></div></div>';modal.classList.add('open');modal.style.display='flex';qs('#dbClose').onclick=()=>{modal.classList.remove('open');modal.style.display='none'};qs('#dbConstructionApprove').onclick=async()=>{await save('construction:'+name,'approved',{name,comment:qs('#dbConstructionComment').value||''});qs('#dbClose').click();rerender('constructions')};qs('#dbConstructionChange').onclick=async()=>{const c=qs('#dbConstructionComment').value.trim();if(!c)return alert('Please enter what needs to change.');await save('construction:'+name,'needs_change',{name,comment:c});qs('#dbClose').click();rerender('constructions')};qs('#dbConstructionQuestion').onclick=()=>{qs('#dbClose').click();window.PV5PremiumInteractions?.goClarification?.(1)};
}
function syncLegacyAfterClick(target){
  setTimeout(()=>{
    const x=legacy();
    const btn=target.closest('button');if(!btn)return;
    const id=btn.dataset.ownerSaveClarify;if(id!=null){const keys=['160x240-standard','invalid-combinations','missing-kld-policy','competitor-directional','construction-complete','other-family-geometry'];const raw=x.clarifications?.[keys[Number(id)]]||'';const [answer,comment='']=raw.split('|||');if(answer)save('clarification:'+keys[Number(id)],'answered',{answer,comment}).catch(()=>{});}
    if(btn.dataset.ownerBusiness){const val=x.businessApprovals?.[btn.dataset.ownerBusiness];if(val===true||val===false)save('business:'+btn.dataset.ownerBusiness,val?'approved':'needs_change',{}).catch(()=>{});}
    if(btn.dataset.familyIndex!=null){const keys=['sup','flat_bottom','center_seal_roll','center_seal_pouch','three_side_seal_roll','three_side_seal_pouch'];const key=keys[Number(btn.dataset.familyIndex)];const val=x.businessApprovals?.['family_'+key];if(val===true||val===false)save('family:'+key,val?'approved':'needs_change',{}).catch(()=>{});}
  },350);
}
function rerender(page){try{window.PV5?.go?.(page)}catch(_){}setTimeout(patchAll,150)}
function patchAll(){patchGlobalTruth();patchFamilies();patchActivation();patchSizes();patchConstructions();}
document.addEventListener('click',e=>syncLegacyAfterClick(e.target),true);
new MutationObserver(()=>setTimeout(patchAll,60)).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('storage',()=>setTimeout(()=>{syncLegacyAfterClick(document.body);patchAll()},100));
load();setInterval(load,15000);
window.PV5DbReview={load,save,decision};
})();