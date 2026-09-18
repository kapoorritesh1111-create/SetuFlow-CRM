(()=>{
'use strict';
const FEEDBACK='/api/public/pricing-v5-feedback';
const STORAGE='setu_pricing_v5_premium_review_v3';
const q=(s,r=document)=>r.querySelector(s), qa=(s,r=document)=>Array.from(r.querySelectorAll(s));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
function page(){return q('#page');}
function pageName(){const t=page()?.querySelector('.page-head h2')?.textContent||page()?.querySelector('h2')?.textContent||'';return t.trim();}
function modal(title,html){const m=q('#modal'),b=q('#modalBody');if(!m||!b)return; b.innerHTML='<div class="modal-head"><h3>'+esc(title)+'</h3><button class="btn outline" data-premium-close>✕ Close</button></div>'+html; m.classList.add('open');m.style.display='flex';q('[data-premium-close]',b)?.addEventListener('click',close);}
function close(){const m=q('#modal');if(m){m.classList.remove('open');m.style.display='none';}}
async function feedback(step,text,status='Review note',priority='normal'){
  try{await fetch(FEEDBACK,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({reviewer_name:'Stark Packmate Owner',review_mode:'admin',step_key:step,rating:status==='Approved'?5:status==='Needs Change'?2:3,priority,feedback:text,page_path:location.pathname})});return true}catch(_){return false}
}
function saved(){try{return JSON.parse(localStorage.getItem(STORAGE)||'{}')}catch(_){return{}}}
function saveState(x){try{localStorage.setItem(STORAGE,JSON.stringify(x));window.dispatchEvent(new Event('storage'));}catch(_){}}
function clarificationIndexFor(title,text=''){
 const s=(title+' '+text).toLowerCase();
 if(s.includes('160')||s.includes('size')&&s.includes('standard'))return 0;
 if(s.includes('construction')||s.includes('manufactur'))return 1;
 if(s.includes('kld')||s.includes('production dieline'))return 2;
 if(s.includes('competitor')||s.includes('market'))return 3;
 if(s.includes('44')||s.includes('construction complete'))return 4;
 if(s.includes('flat bottom')||s.includes('center seal')||s.includes('3 side')||s.includes('family')||s.includes('geometry'))return 5;
 return null;
}
function goClarification(idx){
 if(idx==null){window.PV5?.go?.('approval');setTimeout(()=>scrollOwnerReview(),250);return}
 window.PV5?.go?.('approval');
 setTimeout(()=>{
   const exact=q('[data-owner-clarification="'+idx+'"]')||q('#ownerClarification'+idx)||q('#clarifySelect'+idx)?.closest('.owner-question');
   if(exact){exact.scrollIntoView({behavior:'smooth',block:'center'});exact.classList.add('review-highlight');setTimeout(()=>exact.classList.remove('review-highlight'),2200);return}
   const selects=qa('select[id^="ownerClarification"],select[id^="clarifySelect"]');
   selects[idx]?.scrollIntoView({behavior:'smooth',block:'center'});
 },350);
}
function scrollOwnerReview(){const el=qa('h3,h2,b').find(x=>/Owner Review|Clarification/i.test(x.textContent||''));el?.scrollIntoView({behavior:'smooth',block:'start'});}
function questionButton(idx,label='Answer Required Question'){return '<button class="btn primary" data-answer-q="'+idx+'">'+esc(label)+' →</button>';}
function bindModal(){qa('[data-answer-q]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.answerQ);close();goClarification(i)});}
function reviewRequest(title,context,questionIdx){
 modal(title,'<div class="notice warn"><b>Owner review required.</b> This workspace does not assume approval. Review the current configuration and either approve it, request a change, or answer the related clarification.</div><div class="card" style="padding:16px;margin-top:12px"><p>'+esc(context)+'</p><label class="field"><span>Owner comment / requested change</span><textarea id="premiumReviewComment" rows="5" placeholder="Explain what should change or what you are approving..."></textarea></label><div class="row wrap" style="margin-top:12px;gap:8px"><button class="btn success" id="premiumApprove">Approve This Review Item</button><button class="btn danger" id="premiumChange">Needs Change</button>'+questionButton(questionIdx)+'</div><div id="premiumSaved" style="margin-top:8px"></div></div>');
 q('#premiumApprove')?.addEventListener('click',async()=>{const c=q('#premiumReviewComment')?.value?.trim()||'Owner approved this review item.';await feedback('premium-'+slug(title),title+': '+c,'Approved');q('#premiumSaved').innerHTML='<span class="pill green">Owner approval saved</span>';});
 q('#premiumChange')?.addEventListener('click',async()=>{const c=q('#premiumReviewComment')?.value?.trim();if(!c){alert('Please enter what needs to change.');return}await feedback('premium-'+slug(title),title+': '+c,'Needs Change','important');q('#premiumSaved').innerHTML='<span class="pill red">Needs Change saved</span>';});
 bindModal();
}
function slug(v){return String(v).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,70)}
function rowText(btn){const tr=btn.closest('tr');return tr?qa('td',tr).map(x=>x.textContent.trim()).join(' | '):''}
function constructionView(btn){const t=rowText(btn);reviewRequest('Construction Review',t||'Review the selected construction layers, materials and applicability.',1)}
function constructionEdit(btn){const t=rowText(btn);reviewRequest('Request Construction Change',t||'Review or request changes to this construction. Changes are not applied until approved.',1)}
function sizePreview(btn){const tr=btn.closest('tr');const txt=tr?.textContent?.trim()||'KLD review sample';reviewRequest('Size & KLD Review',txt,2)}
function sizeEdit(btn){reviewRequest('Request Size / KLD Change',rowText(btn)||'Review the size, bottom-gusset rule and KLD sample.',0)}
function wasteEdit(btn){reviewRequest('Commercial Bucket Review',rowText(btn)||'Review wastage %, margin and frame charge for this commercial bucket.',null)}
function impactPreview(){
 const inputs=qa('#page input,#page select').map(x=>x.value).filter(Boolean).slice(-6).join(' → ');
 modal('Impact Preview','<div class="notice info"><b>Review preview only.</b> No production pricing is changed from this screen.</div><div class="card" style="padding:16px;margin-top:12px"><p>Selected change: '+esc(inputs||'Current commercial adjustment')+'</p><p>Open owner clarifications remain for configuration items that are not supported by the approved source data. Review them before final approval.</p><div class="row wrap" style="gap:8px"><button class="btn primary" data-answer-q="0">Review Remaining Construction Restriction →</button></div></div>');bindModal();
}
function matrixView(btn){const tr=btn.closest('tr');const txt=rowText(btn);reviewRequest('Price Matrix Cell Review',txt||'Review this calculated Pricing v5 row and its current status.',null)}
function comparePrevious(){modal('Compare Previous Version','<div class="notice info"><b>Comparison intent:</b> use the current v4 workbook/matrix only as a migration baseline. The new v5 calculation must be reviewed independently.</div><div class="row wrap" style="margin-top:12px"><button class="btn primary" data-answer-q="0">Review Remaining Open Clarification →</button></div>');bindModal()}
function exceptions(){modal('Review Exceptions','<div class="notice warn"><b>Exceptions require owner review.</b> A red/yellow price does not mean rejected or approved; it means it needs a decision.</div><div class="row wrap" style="margin-top:12px"><button class="btn primary" data-answer-q="0">Review Size × Construction Restrictions →</button></div>');bindModal()}
function genericEdit(btn){const p=pageName();reviewRequest(p+' — Review Change',rowText(btn)||('Review requested from '+p+'.'),clarificationIndexFor(p,rowText(btn)))}
function genericView(btn){const p=pageName();reviewRequest(p+' — Detail Review',rowText(btn)||('Review details from '+p+'.'),clarificationIndexFor(p,rowText(btn)))}
function exportMatrix(){const rows=qa('#page table tr').map(r=>qa('th,td',r).map(c=>'"'+String(c.textContent).replace(/"/g,'""')+'"').join(','));if(!rows.length)return alert('No matrix is currently available to export.');const blob=new Blob([rows.join('\n')],{type:'text/csv'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='stark-pricing-v5-review-matrix.csv';a.click();URL.revokeObjectURL(a.href)}
function handle(e){
 const b=e.target.closest('button,a');if(!b||b.closest('#modal'))return;
 const text=(b.textContent||'').trim(); const p=pageName();
 if(b.matches('[data-detail],[data-act],[data-cp],[data-rate-review],[data-band-review],[data-waste-live],.pv5-page-preview,.pv5-page-edit,.pv5-page-approve,.pv5-page-change,#sizeSaveDraft,#sizePublish,#constructionSaveDraft,#constructionPublish,#rateSaveDraft,#ratePreview,#ratePublish,#bandSave,#bandPreview,#bandPublish'))return;
 if(b.matches('[data-page]')||/View Approval Summary/i.test(text)||/Continue to Next Section/i.test(text))return;
 if(/View Cross-Family Impact/i.test(text)){e.preventDefault();window.PV5?.go?.('approval');return}
 if(/Save & Continue to Terms/i.test(text)){e.preventDefault();window.PV5?.go?.('approval');return}
 if(/Find Market Comparables/i.test(text)){e.preventDefault();window.PV5?.go?.('competitor');return}
 if(/Export to Excel/i.test(text)){e.preventDefault();exportMatrix();return}
 if(/Download KLD/i.test(text)){e.preventDefault();window.PV5?.go?.('sizes');return}
 if(/Add Packaging Line|Remove Line/i.test(text)){e.preventDefault();reviewRequest('Sales Quote Review',rowText(b)||'Use the live CRM quote builder for production packaging-line changes. This review workspace does not mutate a customer quote.',null);return}
 if(/Save Draft/i.test(text)){e.preventDefault();reviewRequest('Review Draft Saved','Owner review progress was captured. Continue reviewing the related section before final approval.',2);return}
 if(/Preview All/i.test(text)&&p.includes('Sizes')){e.preventDefault();window.PV5?.go?.('sizes');return}
 if(/Reset Filters/i.test(text)){e.preventDefault();qa('#page select').forEach(s=>s.selectedIndex=0);qa('#page input[type="search"],#page input[placeholder*="Search"]').forEach(i=>i.value='');return}
 if(/Export Matrix/i.test(text)){e.preventDefault();exportMatrix();return}
 if(/Compare Previous Version/i.test(text)){e.preventDefault();comparePrevious();return}
 if(/Review Exceptions/i.test(text)){e.preventDefault();exceptions();return}
 if(/Preview Impact|Run Impact Preview/i.test(text)){e.preventDefault();impactPreview();return}
 if(/^×$/.test(text)&&b.closest('#priceWhy')){e.preventDefault();const panel=b.closest('#priceWhy');if(panel)panel.innerHTML='<div class="panel-title"><h3>Why this price?</h3></div><div class="notice info" style="margin:12px">Select a calculated matrix price to open its engine-backed cost breakdown.</div>';return}
 if(/Reduce Margin|Reduce Waste/i.test(text)){e.preventDefault();const edit=qa('#page [data-band-review]')[0]||qa('#page button').find(x=>/Edit Buckets/i.test(x.textContent||''));if(edit)edit.click();else wasteEdit(b);return}
 if(/Add a Global Adjustment|Global Price Adjustment/i.test(text)){e.preventDefault();reviewRequest('Global Price Adjustment','Capture the proposed global adjustment for owner review. This does not alter live pricing until a controlled implementation and approval exists.',null);return}
 if(/Edit Buckets|Apply to Family/i.test(text)){e.preventDefault();wasteEdit(b);return}
 if(p.includes('Constructions')&&/^View$/i.test(text)){e.preventDefault();constructionView(b);return}
 if(p.includes('Constructions')&&/^Edit$/i.test(text)){e.preventDefault();constructionEdit(b);return}
 if(p.includes('Sizes')&&/Preview/i.test(text)){e.preventDefault();sizePreview(b);return}
 if(p.includes('Sizes')&&/^Edit$/i.test(text)){e.preventDefault();sizeEdit(b);return}
 if(p.includes('Waste')&&/^Edit$/i.test(text)){e.preventDefault();wasteEdit(b);return}
 if(p.includes('Price Matrix')&&/^View$/i.test(text)){e.preventDefault();matrixView(b);return}
 if(/^Edit$/i.test(text)){e.preventDefault();genericEdit(b);return}
 if(/^View$|^Preview$/i.test(text)){e.preventDefault();genericView(b);return}
 if(/Needs Review|Review Required/i.test(text)){e.preventDefault();goClarification(clarificationIndexFor(p,rowText(b)));return}
}
function decorate(){
 const p=page();if(!p)return;
 qa('button',p).forEach(b=>{const t=(b.textContent||'').trim();if(/^(View|Edit|Preview)$|Review Exceptions|Compare Previous Version|Export Matrix|Preview Impact|Run Impact Preview|Edit Buckets|Apply to Family|Reduce Margin|Reduce Waste|Global Adjustment/i.test(t)){b.title=b.title||'Open working owner-review action';b.classList.add('premium-wired')}});
 // Prototype-only pager controls are replaced by the live pagers. If a live module has
 // not mounted yet, make the fallback controls visibly non-interactive instead of dead.
 qa('.pager button',p).forEach(b=>{if(!b.dataset.cp&&!b.dataset.ratePage&&!b.dataset.matrixPage&&!b.dataset.pv5Page){b.disabled=true;b.title='Live review pagination loads with the current Pricing v5 data.'}});
 const nextKld=q('.next-kld',p);if(nextKld&&!nextKld.dataset.liveKld){nextKld.disabled=true;nextKld.title='Use Preview All or the Sizes table to review KLD samples.'}
 qa('.status',p).forEach(s=>{if(/Review Required|Needs Review/i.test(s.textContent||'')){s.style.cursor='pointer';s.title='Open the related clarification / owner-review question';s.onclick=()=>goClarification(clarificationIndexFor(pageName(),s.closest('tr')?.textContent||''));}});
}
document.addEventListener('click',handle,true);
new MutationObserver(()=>decorate()).observe(document.documentElement,{subtree:true,childList:true});
setTimeout(decorate,200);
window.PV5PremiumInteractions={goClarification,reviewRequest,close};
})();