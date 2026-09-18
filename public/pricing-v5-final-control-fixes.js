(()=>{
'use strict';
const q=(s,r=document)=>r.querySelector(s),qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
function page(){return q('#page')}
function title(){return q('#page .page-head h2')?.textContent?.trim()||''}
function selectedConstruction(){return q('#page .detail-card h3')?.textContent?.trim()||q('#page .construction-detail h3')?.textContent?.trim()||qa('#page h3').find(x=>/Construction Details/i.test(x.textContent||''))?.nextElementSibling?.textContent?.trim()||qa('#page tbody tr')[0]?.querySelector('td')?.textContent?.trim()||'Selected construction'}
function review(name,context,question=1){window.PV5PremiumInteractions?.reviewRequest?.(name,context,question)}
async function saveConstruction(decision){const name=selectedConstruction();if(!window.PV5DbReview)return alert('Review state is still loading. Please try again.');await window.PV5DbReview.save('construction:'+name,decision,{name});try{window.PV5?.go?.('constructions')}catch(_){}}
function wireConstructions(){const p=page();if(!p||!/Constructions/i.test(title()))return;
 qa('button',p).forEach(b=>{if(b.hasAttribute('data-detail')||b.hasAttribute('data-rate-review'))return;const t=(b.textContent||'').trim();
  if(/^New Construction$/i.test(t)){b.onclick=e=>{e.preventDefault();e.stopPropagation();review('New Construction Request','Document the additional construction Akshay wants added. This creates a review request only; it does not alter production pricing.',4)}}
  if(/^Preview$/i.test(t)){b.disabled=false;b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Construction Preview',selectedConstruction()+' — review layer stack, materials, printing and restrictions before approval.',1)}}
  if(/^Edit$/i.test(t)&&!b.closest('tr')){b.disabled=false;b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Construction Change Request',selectedConstruction()+' — describe the material/layer/applicability change required.',1)}}
  if(/^Clone$/i.test(t)){b.disabled=false;b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Clone Construction Request','Create a proposed copy of '+selectedConstruction()+'. Specify what should differ from the source construction.',4)}}
  if(/^Approve$/i.test(t)&&!b.closest('tr')){b.disabled=false;b.classList.remove('disabled');b.onclick=async e=>{e.preventDefault();e.stopPropagation();await saveConstruction('approved')}}
 });
}
function wireSizes(){const p=page();if(!p||!/Sizes & KLDs/i.test(title()))return;
 qa('tbody tr',p).forEach(tr=>{const cells=qa('td',tr),size=(cells[1]?.textContent||cells[0]?.textContent||'Selected size').trim();qa('button',tr).forEach(b=>{if(b.matches('.pv5-page-preview,.pv5-page-edit,.pv5-page-approve,.pv5-page-change'))return;const t=(b.textContent||'').trim();if(/^Preview$/i.test(t)){b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Size / KLD Preview',size+' — review the configured size, gusset rule, review KLD and production KLD state.',2)}}if(/^Edit$/i.test(t)){b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Size / KLD Change Request',size+' — describe the required size, pricing group, route, bottom-rule or KLD change.',0)}}});});
}
function wireApproval(){const p=page();if(!p||!/Impact & Approval/i.test(title()))return;qa('button',p).forEach(b=>{const t=(b.textContent||'').trim();if(/Activation Locked|Activate Pricing Structure/i.test(t)){b.disabled=true;b.title='Activation is disabled until the DB-backed owner review is complete.'}})}
function wireWaste(){const p=page();if(!p||!/Waste & Margins/i.test(title()))return;qa('button',p).forEach(b=>{const t=(b.textContent||'').trim();if(/^Apply to Family$/i.test(t)){b.onclick=e=>{e.preventDefault();e.stopPropagation();review('Apply Commercial Rules to Family','Review the proposed waste, margin and frame-charge changes and identify the service family they should apply to. Nothing is promoted to live pricing from this review page.',5)}}if(/^Save Draft$/i.test(t)){b.onclick=async e=>{e.preventDefault();e.stopPropagation();if(window.PV5DbReview)await window.PV5DbReview.save('section:waste-margins','answered',{saved_at:new Date().toISOString()});b.textContent='✓ Draft Saved';setTimeout(()=>b.textContent='Save Draft',1800)}}});}
function apply(){wireConstructions();wireSizes();wireApproval();wireWaste()}
new MutationObserver(()=>setTimeout(apply,40)).observe(document.documentElement,{childList:true,subtree:true});setTimeout(apply,250);
})();